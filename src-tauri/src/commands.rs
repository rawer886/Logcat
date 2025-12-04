use log::{error, info};
use once_cell::sync::Lazy;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::process::Child;
use tokio::sync::{mpsc, Mutex};

use crate::adb::{AdbManager, Device, ProcessInfo};
use crate::parser::LogEntry;

/// Global ADB manager instance
static ADB_MANAGER: Lazy<AdbManager> = Lazy::new(AdbManager::new);

/// Logcat process state
pub struct LogcatState {
    pub process: Arc<Mutex<Option<Child>>>,
    pub is_running: Arc<Mutex<bool>>,
}

impl Default for LogcatState {
    fn default() -> Self {
        LogcatState {
            process: Arc::new(Mutex::new(None)),
            is_running: Arc::new(Mutex::new(false)),
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

    // Check if already running
    {
        let is_running = state.is_running.lock().await;
        if *is_running {
            return Err("Logcat is already running".to_string());
        }
    }

    // Stop any existing process
    stop_logcat_internal(&state).await?;

    // Create channel for log entries
    let (tx, mut rx) = mpsc::channel::<LogEntry>(1000);

    // Start logcat process
    let child = ADB_MANAGER
        .start_logcat(&device_id, tx)
        .await?;

    // Store process handle
    {
        let mut process = state.process.lock().await;
        *process = Some(child);
    }

    // Mark as running
    {
        let mut is_running = state.is_running.lock().await;
        *is_running = true;
    }

    // Spawn task to forward logs to frontend
    let app_handle = app.clone();
    let is_running = state.is_running.clone();
    
    tokio::spawn(async move {
        let mut batch: Vec<LogEntry> = Vec::with_capacity(100);
        let mut last_emit = std::time::Instant::now();
        
        loop {
            // Check if still running
            {
                let running = is_running.lock().await;
                if !*running {
                    break;
                }
            }

            // Try to receive logs with timeout
            match tokio::time::timeout(
                std::time::Duration::from_millis(50),
                rx.recv()
            ).await {
                Ok(Some(entry)) => {
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

        info!("Logcat forwarding task finished");
    });

    Ok(())
}

/// Stop logcat streaming
#[tauri::command]
pub async fn stop_logcat(state: State<'_, LogcatState>) -> Result<(), String> {
    info!("Stopping logcat");
    stop_logcat_internal(&state).await
}

/// Internal function to stop logcat
async fn stop_logcat_internal(state: &LogcatState) -> Result<(), String> {
    // Mark as not running
    {
        let mut is_running = state.is_running.lock().await;
        *is_running = false;
    }

    // Kill process if running
    {
        let mut process = state.process.lock().await;
        if let Some(ref mut child) = *process {
            let _ = child.kill().await;
        }
        *process = None;
    }

    Ok(())
}

/// Clear logcat buffer on device
#[tauri::command]
pub async fn clear_logcat(device_id: String) -> Result<(), String> {
    info!("Clearing logcat for device: {}", device_id);
    ADB_MANAGER.clear_logcat(&device_id).await
}

