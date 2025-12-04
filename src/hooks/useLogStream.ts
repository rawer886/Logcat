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

        // Set up listener for log entries
        unlistenRef.current = await listen<LogEntry[]>(
          "logcat-entries",
          (event) => {
            addLogs(event.payload);
          }
        );

        // Start logcat on backend
        await invoke("start_logcat", { deviceId });
        setConnected(true);

        // Update selected device - get fresh device list from store
        const currentDevices = useLogStore.getState().devices;
        const device = currentDevices.find((d) => d.id === deviceId);
        if (device) {
          selectDevice(device);
        }

        // Refresh processes
        await refreshProcesses(deviceId);
      } catch (error) {
        console.error("Failed to start logcat:", error);
        setConnected(false);
        throw error;
      }
    },
    [addLogs, setConnected, selectDevice, refreshProcesses]
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

  // Track if we've auto-connected
  const hasAutoConnectedRef = useRef(false);

  // Auto-select first device when devices are loaded
  useEffect(() => {
    if (
      !hasAutoConnectedRef.current &&
      !isConnected &&
      !selectedDevice &&
      devices.length > 0
    ) {
      // Find first available device (state === "device")
      const availableDevice = devices.find((d) => d.state === "device");
      if (availableDevice) {
        hasAutoConnectedRef.current = true;
        startLogcat(availableDevice.id).catch((error) => {
          console.error("Auto-connect failed:", error);
          hasAutoConnectedRef.current = false;
        });
      }
    }
  }, [devices, isConnected, selectedDevice, startLogcat]);

  // Initial device refresh
  useEffect(() => {
    refreshDevices();

    // Set up interval to refresh devices
    const interval = setInterval(refreshDevices, 5000);

    return () => {
      clearInterval(interval);
      // Clean up listener on unmount
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, [refreshDevices]);

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

