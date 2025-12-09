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
  processes: ProcessInfo[];
  startLogcat: (deviceId: string) => Promise<void>;
  stopLogcat: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshProcesses: (deviceId: string) => Promise<void>;
  clearDeviceLogs: (deviceId: string) => Promise<void>;
}

export function useLogStream(): UseLogStreamReturn {
  const {
    devices,
    selectedDevice,
    processes,
    isConnected,
    isLoading,
    setDevices,
    selectDevice,
    setProcesses,
    addLogs,
    setConnected,
    setLoading,
    clearLogs,
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

  // Start logcat for a device
  const startLogcat = useCallback(
    async (deviceId: string) => {
      try {
        // Clean up existing listener
        if (unlistenRef.current) {
          unlistenRef.current();
          unlistenRef.current = null;
        }

        // Set up listener for log entries - use addLogsForDevice with deviceId
        unlistenRef.current = await listen<LogEntry[]>(
          "logcat-entries",
          (event) => {
            const state = useLogStore.getState();
            state.addLogsForDevice(deviceId, event.payload);
          }
        );

        // Start logcat on backend
        await invoke("start_logcat", { deviceId });
        setConnected(true);

        // Switch to device - use switchToDevice to load history
        const state = useLogStore.getState();
        state.switchToDevice(deviceId);

        // Refresh processes
        await refreshProcesses(deviceId);
      } catch (error) {
        console.error("Failed to start logcat:", error);
        setConnected(false);
        throw error;
      }
    },
    [setConnected, refreshProcesses]
  );

  // Stop logcat
  const stopLogcat = useCallback(async () => {
    try {
      await invoke("stop_logcat");
      setConnected(false);

      // Clean up listener
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    } catch (error) {
      console.error("Failed to stop logcat:", error);
    }
  }, [setConnected]);

  // Clear device logs
  const clearDeviceLogs = useCallback(
    async (deviceId: string) => {
      try {
        await invoke("clear_logcat", { deviceId });
        clearLogs();
      } catch (error) {
        console.error("Failed to clear logs:", error);
      }
    },
    [clearLogs]
  );

  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  return {
    isConnected,
    isLoading,
    devices,
    selectedDevice,
    processes,
    startLogcat,
    stopLogcat,
    refreshDevices,
    refreshProcesses,
    clearDeviceLogs,
  };
}

