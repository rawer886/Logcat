import React, { useState, useCallback } from "react";
import {
  Smartphone,
  Sun,
  Moon,
  Settings,
  ChevronDown,
  Search,
  X,
  CaseSensitive,
  Regex,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { useLogStream } from "../hooks/useLogStream";
import { useFilter } from "../hooks/useFilter";
import { SettingsPanel } from "./SettingsPanel";
import type { Device } from "../types";

export function Toolbar() {
  const { settings, toggleTheme } = useLogStore();
  const {
    devices,
    selectedDevice,
    isConnected,
    startLogcat,
    stopLogcat,
  } = useLogStream();
  const {
    filter,
    setSearchText,
    toggleRegex,
    toggleCaseSensitive,
  } = useFilter();

  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleDeviceSelect = async (device: Device) => {
    setIsDeviceMenuOpen(false);
    if (isConnected) {
      await stopLogcat();
    }
    await startLogcat(device.id);
  };

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
    },
    [setSearchText]
  );

  const handleClearSearch = useCallback(() => {
    setSearchText("");
  }, [setSearchText]);

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
            "min-w-[180px] justify-between"
          )}
        >
          <div className="flex items-center gap-2">
            <Smartphone className={cn(
              "w-4 h-4",
              isConnected ? "text-log-info" : "text-text-secondary"
            )} />
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

      {/* Search Input */}
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={filter.searchText}
          onChange={handleSearchChange}
          placeholder="搜索日志..."
          className={cn(
            "w-full pl-9 pr-24 py-1.5 rounded-md text-sm",
            "bg-surface border border-border",
            "text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
            "transition-colors duration-150"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Case Sensitive Toggle */}
          <button
            onClick={toggleCaseSensitive}
            className={cn(
              "p-1 rounded transition-colors",
              filter.isCaseSensitive
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-elevated"
            )}
            title="区分大小写"
          >
            <CaseSensitive className="w-4 h-4" />
          </button>

          {/* Regex Toggle */}
          <button
            onClick={toggleRegex}
            className={cn(
              "p-1 rounded transition-colors",
              filter.isRegex
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-elevated"
            )}
            title="正则表达式"
          >
            <Regex className="w-4 h-4" />
          </button>

          {/* Clear Search */}
          {filter.searchText && (
            <button
              onClick={handleClearSearch}
              className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-elevated transition-colors"
              title="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

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
