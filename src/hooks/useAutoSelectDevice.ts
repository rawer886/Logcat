import { useEffect } from 'react';
import { useLogStore } from '../stores/logStore';
import { useLogStream } from './useLogStream';

/**
 * Hook to automatically select and connect to a device on startup
 * Priority: lastSelectedDevice > first available device
 */
export function useAutoSelectDevice() {
  const {
    devices,
    selectedDevice,
    lastSelectedDeviceId,
    isConnected,
    importedFileName
  } = useLogStore();
  const { startLogcat, refreshDevices } = useLogStream();

  // Refresh device list on mount
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Auto-select device when conditions are met
  useEffect(() => {
    // Conditions: has devices, not connected, no device selected, no imported file
    if (devices.length > 0 && !isConnected && !selectedDevice && !importedFileName) {
      const targetDevice =
        // Priority 1: Select last selected device if still online
        devices.find(d => d.id === lastSelectedDeviceId && d.state === 'device') ||
        // Priority 2: Select first available device
        devices.find(d => d.state === 'device');

      if (targetDevice) {
        console.log(`自动选择设备: ${targetDevice.name}`);
        startLogcat(targetDevice.id).catch(err => {
          console.error('Failed to auto-select device:', err);
        });
      }
    }
  }, [devices, isConnected, selectedDevice, lastSelectedDeviceId, importedFileName, startLogcat]);
}
