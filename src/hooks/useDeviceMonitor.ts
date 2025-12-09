import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useLogStore } from '../stores/logStore';
import { useLogStream } from './useLogStream';
import type { Device } from '../types';

interface DeviceEvent {
  type: 'connected' | 'disconnected' | 'listUpdated';
  device?: Device;
  deviceId?: string;
  devices?: Device[];
}

/**
 * Hook to monitor device connection/disconnection events from backend
 * Automatically handles device reconnection and adds system markers
 */
export function useDeviceMonitor() {
  const {
    selectedDevice,
    addDeviceMarker,
    setDevices,
  } = useLogStore();
  const { stopLogcat, startLogcat } = useLogStream();

  useEffect(() => {
    const unlisten = listen<DeviceEvent>('device-event', async (event) => {
      const { type, device, deviceId, devices: deviceList } = event.payload;

      switch (type) {
        case 'connected':
          if (device) {
            console.log(`设备已连接: ${device.name}`);

            // 如果是之前选中的设备重连
            if (selectedDevice?.id === device.id) {
              addDeviceMarker(
                device.id,
                `设备已重新连接 (${new Date().toLocaleTimeString()})`,
                'reconnect'
              );
              // 自动恢复日志流
              await startLogcat(device.id);
            }
          }
          break;

        case 'disconnected':
          if (deviceId) {
            console.log(`设备已断开: ${deviceId}`);

            // 如果是当前选中的设备断开
            if (selectedDevice?.id === deviceId) {
              addDeviceMarker(
                deviceId,
                `设备已断开连接 (${new Date().toLocaleTimeString()})`,
                'disconnect'
              );
              // 停止日志流但不清空日志
              await stopLogcat();
            }
          }
          break;

        case 'listUpdated':
          if (deviceList) {
            // 更新设备列表
            setDevices(deviceList);
          }
          break;
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [selectedDevice, addDeviceMarker, stopLogcat, startLogcat, setDevices]);
}
