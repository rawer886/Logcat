import { useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useLogStore } from "../stores/logStore";
import type { LogEntry, Device, ProcessInfo } from "../types";

interface UseLogStreamReturn {
  isConnected: boolean;
  isLoading: boolean;
  devices: Device[];
  selectedDevice: Device | null;
  monitoringDevices: Set<string>;
  processes: ProcessInfo[];
  startLogcat: (deviceId: string) => Promise<void>;
  stopLogcat: (deviceId: string) => Promise<void>;
  stopAllLogcat: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshProcesses: (deviceId: string) => Promise<void>;
  clearDeviceLogs: (deviceId: string) => Promise<void>;
}

export function useLogStream(): UseLogStreamReturn {
  const {
    devices,
    selectedDevice,
    monitoringDevices,
    processes,
    isConnected,
    isLoading,
    setDevices,
    switchToDevice,
    addMonitoringDevice,
    removeMonitoringDevice,
    setProcesses,
    addLogsForDevice,
    setConnected,
    setLoading,
    clearDeviceLogs: storeClearDeviceLogs,
  } = useLogStore();

  const unlistenRef = useRef<UnlistenFn | null>(null);

  // Refresh device list
  const refreshDevices = useCallback(async () => {
    setLoading(true);
    try {
      const deviceList = await invoke<Device[]>("get_devices");
      setDevices(deviceList);
    } catch (error) {
      console.error("Failed to get devices:", error);
    } finally {
      setLoading(false);
    }
  }, [setDevices, setLoading]);

  // Refresh process list
  const refreshProcesses = useCallback(
    async (deviceId: string) => {
      try {
        const processList = await invoke<ProcessInfo[]>("get_processes", {
          deviceId,
        });
        setProcesses(processList);
      } catch (error) {
        console.error("Failed to get processes:", error);
      }
    },
    [setProcesses]
  );

  // Set up global listener for log entries (only once)
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<LogEntry[]>("logcat-entries", (event) => {
        const entries = event.payload;
        if (entries.length > 0) {
          // 日志已经包含 deviceId (后端设置)
          const deviceId = entries[0].deviceId;
          if (deviceId) {
            const state = useLogStore.getState();
            state.addLogsForDevice(deviceId, entries);
          }
        }
      });
      unlistenRef.current = unlisten;
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // Start logcat for a device
  const startLogcat = useCallback(
    async (deviceId: string) => {
      try {
        // Start logcat on backend
        await invoke("start_logcat", { deviceId });

        // Add to monitoring devices
        addMonitoringDevice(deviceId);

        // Switch to this device
        switchToDevice(deviceId);

        // Update connection status if this is the first device
        if (monitoringDevices.size === 0) {
          setConnected(true);
        }

        // Refresh processes
        await refreshProcesses(deviceId);
      } catch (error) {
        console.error("Failed to start logcat:", error);
        throw error;
      }
    },
    [monitoringDevices, addMonitoringDevice, switchToDevice, setConnected, refreshProcesses]
  );

  // Stop logcat for a specific device
  const stopLogcat = useCallback(
    async (deviceId: string) => {
      try {
        await invoke("stop_logcat", { deviceId });

        // Remove from monitoring devices
        removeMonitoringDevice(deviceId);

        // Update connection status if no devices left
        if (monitoringDevices.size <= 1) {
          setConnected(false);
        }
      } catch (error) {
        console.error("Failed to stop logcat:", error);
      }
    },
    [monitoringDevices, removeMonitoringDevice, setConnected]
  );

  // Stop all logcat streams
  const stopAllLogcat = useCallback(async () => {
    try {
      await invoke("stop_all_logcat");
      setConnected(false);

      // Clear monitoring devices
      const state = useLogStore.getState();
      state.monitoringDevices.forEach((deviceId) => {
        removeMonitoringDevice(deviceId);
      });
    } catch (error) {
      console.error("Failed to stop all logcat:", error);
    }
  }, [setConnected, removeMonitoringDevice]);

  // Clear device logs
  const clearDeviceLogs = useCallback(
    async (deviceId: string) => {
      try {
        await invoke("clear_logcat", { deviceId });
        storeClearDeviceLogs(deviceId);
      } catch (error) {
        console.error("Failed to clear logs:", error);
      }
    },
    [storeClearDeviceLogs]
  );

  return {
    isConnected,
    isLoading,
    devices,
    selectedDevice,
    monitoringDevices,
    processes,
    startLogcat,
    stopLogcat,
    stopAllLogcat,
    refreshDevices,
    refreshProcesses,
    clearDeviceLogs,
  };
}

