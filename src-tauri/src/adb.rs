use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, RwLock};
use tokio::time::{interval, Duration};
use log::{debug, info};

use crate::parser::{LogEntry, LogParser};

/// Represents a connected Android device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub model: String,
    pub state: DeviceState,
    #[serde(rename = "isEmulator")]
    pub is_emulator: bool,
}

/// Device connection state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DeviceState {
    Device,
    Offline,
    Unauthorized,
    #[serde(rename = "no device")]
    NoDevice,
}

impl DeviceState {
    fn from_str(s: &str) -> Self {
        match s.trim().to_lowercase().as_str() {
            "device" => DeviceState::Device,
            "offline" => DeviceState::Offline,
            "unauthorized" => DeviceState::Unauthorized,
            _ => DeviceState::NoDevice,
        }
    }
}

/// Process information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    #[serde(rename = "packageName")]
    pub package_name: Option<String>,
}

/// ADB manager for device communication
pub struct AdbManager {
    adb_path: String,
}

impl AdbManager {
    pub fn new() -> Self {
        AdbManager {
            adb_path: "adb".to_string(),
        }
    }

    pub fn with_path(path: String) -> Self {
        AdbManager { adb_path: path }
    }

    /// Check if ADB is available
    pub async fn check_adb(&self) -> Result<bool, String> {
        let output = Command::new(&self.adb_path)
            .arg("version")
            .output()
            .await
            .map_err(|e| format!("Failed to run adb: {}", e))?;

        Ok(output.status.success())
    }

    /// Get list of connected devices
    pub async fn get_devices(&self) -> Result<Vec<Device>, String> {
        let output = Command::new(&self.adb_path)
            .args(["devices", "-l"])
            .output()
            .await
            .map_err(|e| format!("Failed to get devices: {}", e))?;

        if !output.status.success() {
            return Err("ADB command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let devices = self.parse_devices_output(&stdout).await;
        
        Ok(devices)
    }

    /// Parse the output of `adb devices -l`
    async fn parse_devices_output(&self, output: &str) -> Vec<Device> {
        let mut devices = Vec::new();

        for line in output.lines().skip(1) {
            // Skip header line
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 2 {
                continue;
            }

            let id = parts[0].to_string();
            let state = DeviceState::from_str(parts[1]);

            // Parse additional device info
            let mut model = String::new();
            let mut name = String::new();

            for part in &parts[2..] {
                if let Some(val) = part.strip_prefix("model:") {
                    model = val.replace('_', " ");
                }
                if let Some(val) = part.strip_prefix("device:") {
                    name = val.to_string();
                }
            }

            // Check if emulator
            let is_emulator = id.starts_with("emulator-") || id.contains("localhost");

            // Get device name if not available
            if name.is_empty() {
                name = if is_emulator {
                    format!("Emulator ({})", id)
                } else {
                    model.clone()
                };
            }

            if model.is_empty() {
                model = name.clone();
            }

            devices.push(Device {
                id,
                name,
                model,
                state,
                is_emulator,
            });
        }

        devices
    }

    /// Get running processes on a device
    pub async fn get_processes(&self, device_id: &str) -> Result<Vec<ProcessInfo>, String> {
        let output = Command::new(&self.adb_path)
            .args(["-s", device_id, "shell", "ps", "-A", "-o", "PID,NAME"])
            .output()
            .await
            .map_err(|e| format!("Failed to get processes: {}", e))?;

        if !output.status.success() {
            return Err("Failed to get process list".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let processes = self.parse_processes_output(&stdout);
        
        Ok(processes)
    }

    /// Parse the output of ps command
    fn parse_processes_output(&self, output: &str) -> Vec<ProcessInfo> {
        let mut processes = Vec::new();

        for line in output.lines().skip(1) {
            // Skip header
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 2 {
                continue;
            }

            if let Ok(pid) = parts[0].parse::<u32>() {
                let name = parts[1..].join(" ");
                let package_name = if name.contains('.') {
                    Some(name.clone())
                } else {
                    None
                };

                processes.push(ProcessInfo {
                    pid,
                    name,
                    package_name,
                });
            }
        }

        processes
    }

    /// Start logcat streaming with process info enrichment
    pub async fn start_logcat(
        &self,
        device_id: &str,
        sender: mpsc::Sender<LogEntry>,
    ) -> Result<tokio::process::Child, String> {
        info!("Starting logcat for device: {}", device_id);

        // Create process cache
        let process_cache: Arc<RwLock<HashMap<u32, (String, Option<String>)>>> = 
            Arc::new(RwLock::new(HashMap::new()));

        // Initial process list fetch
        if let Ok(processes) = self.get_processes(device_id).await {
            let mut cache = process_cache.write().await;
            for proc in processes {
                cache.insert(proc.pid, (proc.name.clone(), proc.package_name.clone()));
            }
            info!("Loaded {} processes into cache", cache.len());
        }

        // Spawn task to periodically refresh process list
        let adb_path = self.adb_path.clone();
        let device_id_clone = device_id.to_string();
        let cache_clone = process_cache.clone();
        tokio::spawn(async move {
            let mut refresh_interval = interval(Duration::from_secs(5));
            loop {
                refresh_interval.tick().await;
                
                let output = Command::new(&adb_path)
                    .args(["-s", &device_id_clone, "shell", "ps", "-A", "-o", "PID,NAME"])
                    .output()
                    .await;

                if let Ok(output) = output {
                    if output.status.success() {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let mut cache = cache_clone.write().await;
                        
                        for line in stdout.lines().skip(1) {
                            let parts: Vec<&str> = line.trim().split_whitespace().collect();
                            if parts.len() >= 2 {
                                if let Ok(pid) = parts[0].parse::<u32>() {
                                    let name = parts[1..].join(" ");
                                    let package_name = if name.contains('.') {
                                        Some(name.clone())
                                    } else {
                                        None
                                    };
                                    cache.insert(pid, (name, package_name));
                                }
                            }
                        }
                    }
                }
            }
        });

        info!("Clearing logcat buffer before streaming");
        self.clear_logcat(device_id).await?;

        let mut child = Command::new(&self.adb_path)
            .args(["-s", device_id, "logcat", "-v", "threadtime"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start logcat: {}", e))?;

        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        let mut parser = LogParser::new();
        let cache_for_reader = process_cache.clone();

        // Spawn task to read logcat output
        tokio::spawn(async move {
            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(mut entry) = parser.parse_line(&line) {
                    // Enrich with process info from cache
                    let cache = cache_for_reader.read().await;
                    if let Some((process_name, package_name)) = cache.get(&entry.pid) {
                        entry.process_name = Some(process_name.clone());
                        entry.package_name = package_name.clone();
                    }
                    drop(cache);
                    
                    if sender.send(entry).await.is_err() {
                        debug!("Logcat receiver dropped, stopping");
                        break;
                    }
                }
            }
            info!("Logcat reader task finished");
        });

        Ok(child)
    }

    /// Clear logcat buffer
    pub async fn clear_logcat(&self, device_id: &str) -> Result<(), String> {
        let output = Command::new(&self.adb_path)
            .args(["-s", device_id, "logcat", "-c"])
            .output()
            .await
            .map_err(|e| format!("Failed to clear logcat: {}", e))?;

        if output.status.success() {
            info!("Logcat cleared for device: {}", device_id);
            Ok(())
        } else {
            Err("Failed to clear logcat".to_string())
        }
    }
}

impl Default for AdbManager {
    fn default() -> Self {
        Self::new()
    }
}

