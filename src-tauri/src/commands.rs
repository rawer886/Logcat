use log::{error, info};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::process::Child;
use tokio::sync::{mpsc, RwLock};

use crate::adb::{AdbManager, Device, ProcessInfo};
use crate::parser::LogEntry;

/// Global ADB manager instance
static ADB_MANAGER: Lazy<AdbManager> = Lazy::new(AdbManager::new);

/// Single device's logcat process info
struct DeviceLogcatProcess {
    process: Child,
    is_running: bool,
}

/// Logcat state supporting multiple devices
pub struct LogcatState {
    // Map of device_id -> process handle
    devices: Arc<RwLock<HashMap<String, DeviceLogcatProcess>>>,
}

impl Default for LogcatState {
    fn default() -> Self {
        LogcatState {
            devices: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

/// Check if ADB is available
#[tauri::command]
pub async fn check_adb() -> Result<bool, String> {
    ADB_MANAGER.check_adb().await
}

/// Get list of connected devices
#[tauri::command]
pub async fn get_devices() -> Result<Vec<Device>, String> {
    info!("Getting device list");
    ADB_MANAGER.get_devices().await
}

/// Get processes running on a device
#[tauri::command]
pub async fn get_processes(device_id: String) -> Result<Vec<ProcessInfo>, String> {
    info!("Getting processes for device: {}", device_id);
    ADB_MANAGER.get_processes(&device_id).await
}

/// Start logcat streaming for a device
#[tauri::command]
pub async fn start_logcat(
    app: AppHandle,
    device_id: String,
    state: State<'_, LogcatState>,
) -> Result<(), String> {
    info!("Starting logcat for device: {}", device_id);

    // Check if already running for this device
    {
        let devices = state.devices.read().await;
        if devices.contains_key(&device_id) {
            return Err(format!("Logcat already running for device: {}", device_id));
        }
    }

    // Create channel for log entries
    let (tx, mut rx) = mpsc::channel::<LogEntry>(1000);

    // Start logcat process
    let child = ADB_MANAGER
        .start_logcat(&device_id, tx)
        .await?;

    // Store process handle
    {
        let mut devices = state.devices.write().await;
        devices.insert(device_id.clone(), DeviceLogcatProcess {
            process: child,
            is_running: true,
        });
    }

    // Spawn task to forward logs to frontend with device_id
    let app_handle = app.clone();
    let device_id_clone = device_id.clone();
    let devices_ref = state.devices.clone();

    tokio::spawn(async move {
        let mut batch: Vec<LogEntry> = Vec::with_capacity(100);
        let mut last_emit = std::time::Instant::now();

        loop {
            // Check if still running
            {
                let devices = devices_ref.read().await;
                if let Some(device_process) = devices.get(&device_id_clone) {
                    if !device_process.is_running {
                        break;
                    }
                } else {
                    break;
                }
            }

            // Try to receive logs with timeout
            match tokio::time::timeout(
                std::time::Duration::from_millis(50),
                rx.recv()
            ).await {
                Ok(Some(mut entry)) => {
                    // Attach device_id to log entry
                    entry.device_id = Some(device_id_clone.clone());
                    batch.push(entry);

                    // Emit batch if large enough or enough time passed
                    if batch.len() >= 50 || last_emit.elapsed().as_millis() > 100 {
                        if let Err(e) = app_handle.emit("logcat-entries", &batch) {
                            error!("Failed to emit logs: {}", e);
                        }
                        batch.clear();
                        last_emit = std::time::Instant::now();
                    }
                }
                Ok(None) => {
                    // Channel closed
                    break;
                }
                Err(_) => {
                    // Timeout - emit any pending logs
                    if !batch.is_empty() {
                        if let Err(e) = app_handle.emit("logcat-entries", &batch) {
                            error!("Failed to emit logs: {}", e);
                        }
                        batch.clear();
                        last_emit = std::time::Instant::now();
                    }
                }
            }
        }

        // Emit any remaining logs
        if !batch.is_empty() {
            let _ = app_handle.emit("logcat-entries", &batch);
        }

        info!("Logcat forwarding task finished for device: {}", device_id_clone);
    });

    Ok(())
}

/// Stop logcat streaming for a specific device
#[tauri::command]
pub async fn stop_logcat(device_id: String, state: State<'_, LogcatState>) -> Result<(), String> {
    info!("Stopping logcat for device: {}", device_id);

    let mut devices = state.devices.write().await;
    if let Some(mut device_process) = devices.remove(&device_id) {
        device_process.is_running = false;
        let _ = device_process.process.kill().await;
        info!("Stopped logcat for device: {}", device_id);
    }

    Ok(())
}

/// Stop all logcat streams
#[tauri::command]
pub async fn stop_all_logcat(state: State<'_, LogcatState>) -> Result<(), String> {
    info!("Stopping all logcat streams");

    let mut devices = state.devices.write().await;
    for (device_id, mut device_process) in devices.drain() {
        device_process.is_running = false;
        let _ = device_process.process.kill().await;
        info!("Stopped logcat for device: {}", device_id);
    }

    Ok(())
}

/// Get list of currently monitored devices
#[tauri::command]
pub async fn get_monitoring_devices(state: State<'_, LogcatState>) -> Result<Vec<String>, String> {
    let devices = state.devices.read().await;
    Ok(devices.keys().cloned().collect())
}

/// Clear logcat buffer on device
#[tauri::command]
pub async fn clear_logcat(device_id: String) -> Result<(), String> {
    info!("Clearing logcat for device: {}", device_id);
    ADB_MANAGER.clear_logcat(&device_id).await
}

