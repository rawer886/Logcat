import React from "react";
import {
  Smartphone,
  RefreshCw,
  Sun,
  Moon,
  Settings,
  Play,
  Square,
  ChevronDown,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { useLogStream } from "../hooks/useLogStream";
import { SettingsPanel } from "./SettingsPanel";
import type { Device } from "../types";

export function Toolbar() {
  const { settings, toggleTheme } = useLogStore();
  const {
    devices,
    selectedDevice,
    isConnected,
    isLoading,
    startLogcat,
    stopLogcat,
    refreshDevices,
  } = useLogStream();

  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const handleDeviceSelect = async (device: Device) => {
    setIsDeviceMenuOpen(false);
    if (isConnected) {
      await stopLogcat();
    }
    await startLogcat(device.id);
  };

  const handleToggleConnection = async () => {
    if (isConnected && selectedDevice) {
      await stopLogcat();
    } else if (selectedDevice) {
      await startLogcat(selectedDevice.id);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-surface-secondary border-b border-border transition-theme">
      {/* Device Selector */}
      <div className="relative">
        <button
          onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
            "bg-surface hover:bg-surface-elevated border border-border",
            "transition-colors duration-150",
            "min-w-[200px] justify-between"
          )}
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-text-secondary" />
            <span className="text-text-primary truncate">
              {selectedDevice?.name || "选择设备"}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-text-muted transition-transform duration-200",
              isDeviceMenuOpen && "transform rotate-180"
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isDeviceMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDeviceMenuOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-full min-w-[250px] bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1 animate-fade-in">
              {devices.length === 0 ? (
                <div className="px-3 py-2 text-sm text-text-muted">
                  未检测到设备
                </div>
              ) : (
                devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleDeviceSelect(device)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                      "hover:bg-accent/10 transition-colors",
                      selectedDevice?.id === device.id && "bg-accent/20"
                    )}
                  >
                    <Smartphone
                      className={cn(
                        "w-4 h-4",
                        device.state === "device"
                          ? "text-log-info"
                          : "text-text-muted"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-text-primary truncate">
                        {device.name}
                      </div>
                      <div className="text-2xs text-text-muted truncate">
                        {device.id}
                      </div>
                    </div>
                    {device.isEmulator && (
                      <span className="text-2xs px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                        模拟器
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Refresh Devices */}
      <button
        onClick={refreshDevices}
        disabled={isLoading}
        className={cn(
          "p-2 rounded-md hover:bg-surface-elevated transition-colors",
          "text-text-secondary hover:text-text-primary",
          isLoading && "animate-spin"
        )}
        title="刷新设备列表"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Connect/Disconnect Button */}
      <button
        onClick={handleToggleConnection}
        disabled={!selectedDevice}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
          "transition-colors duration-150",
          isConnected
            ? "bg-log-error/20 text-log-error hover:bg-log-error/30"
            : "bg-log-info/20 text-log-info hover:bg-log-info/30",
          !selectedDevice && "opacity-50 cursor-not-allowed"
        )}
      >
        {isConnected ? (
          <>
            <Square className="w-4 h-4" />
            <span>停止</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span>开始</span>
          </>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={cn(
          "p-2 rounded-md hover:bg-surface-elevated transition-colors",
          "text-text-secondary hover:text-text-primary"
        )}
        title={settings.theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
      >
        {settings.theme === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>

      {/* Settings */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className={cn(
          "p-2 rounded-md hover:bg-surface-elevated transition-colors",
          "text-text-secondary hover:text-text-primary"
        )}
        title="设置"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

