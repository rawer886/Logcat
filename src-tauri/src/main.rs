// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod adb;
mod commands;
mod filter;
mod parser;

use adb::AdbManager;
use commands::LogcatState;
use log::info;

fn main() {
    // Initialize logger
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    info!("Starting Logcat application");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(LogcatState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_devices,
            commands::start_logcat,
            commands::stop_logcat,
            commands::clear_logcat,
            commands::get_processes,
            commands::check_adb,
        ])
        .setup(|app| {
            info!("Tauri app setup complete");

            // Start device monitoring task
            let app_handle = app.handle().clone();
            let adb_manager = AdbManager::new();
            adb_manager.start_device_monitor(app_handle);
            info!("Device monitor started");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

