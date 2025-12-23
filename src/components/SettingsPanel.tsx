import React from "react";
import { X, Type, AlignJustify, Monitor, Clock, Hash, Tag, Sun, Moon, Laptop } from "lucide-react";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import type { TimestampFormat } from "../types";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useLogStore();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-surface-elevated border-l border-border shadow-xl z-50 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">设置</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-auto h-[calc(100%-56px)]">
          {/* Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Sun className="w-4 h-4" />
              <span className="font-medium">主题</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "light", label: "浅色", icon: Sun },
                { value: "dark", label: "深色", icon: Moon },
                { value: "system", label: "跟随系统", icon: Laptop },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateSettings({ theme: option.value as "light" | "dark" | "system" })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                      settings.theme === option.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border hover:border-border-strong hover:bg-surface-secondary text-text-secondary"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-text-primary">
              <Type className="w-4 h-4" />
              <span className="font-medium">字体大小</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="20"
                step="1"
                value={settings.fontSize}
                onChange={(e) =>
                  updateSettings({ fontSize: parseInt(e.target.value) })
                }
                className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="w-12 text-center text-sm text-text-secondary bg-surface-secondary px-2 py-1 rounded">
                {settings.fontSize}px
              </span>
            </div>
          </div>

          {/* Line Height */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-text-primary">
              <AlignJustify className="w-4 h-4" />
              <span className="font-medium">行高</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1.2"
                max="2.5"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) =>
                  updateSettings({ lineHeight: parseFloat(e.target.value) })
                }
                className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="w-12 text-center text-sm text-text-secondary bg-surface-secondary px-2 py-1 rounded">
                {settings.lineHeight.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Timestamp Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Clock className="w-4 h-4" />
              <span className="font-medium">时间戳</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-secondary">显示时间戳</span>
              <input
                type="checkbox"
                checked={settings.showTimestamp}
                onChange={(e) =>
                  updateSettings({ showTimestamp: e.target.checked })
                }
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>

            {settings.showTimestamp && (
              <div className="space-y-2 pl-4 border-l-2 border-border">
                <div className="text-xs text-text-muted">时间格式</div>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "datetime", label: "日期 + 时间", example: "12-04 15:30:45.123" },
                    { value: "time", label: "仅时间", example: "15:30:45.123" },
                    { value: "epoch", label: "时间戳", example: "1701678645123" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                        settings.timestampFormat === option.value
                          ? "bg-accent/20"
                          : "hover:bg-surface-secondary"
                      )}
                    >
                      <input
                        type="radio"
                        name="timestampFormat"
                        value={option.value}
                        checked={settings.timestampFormat === option.value}
                        onChange={(e) =>
                          updateSettings({ timestampFormat: e.target.value as TimestampFormat })
                        }
                        className="accent-accent"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-text-primary">{option.label}</div>
                        <div className="text-xs text-text-muted font-mono">{option.example}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Process ID Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Hash className="w-4 h-4" />
              <span className="font-medium">进程 ID</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-secondary">显示 PID</span>
              <input
                type="checkbox"
                checked={settings.showPid}
                onChange={(e) =>
                  updateSettings({ showPid: e.target.checked })
                }
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>

            {settings.showPid && (
              <label className="flex items-center justify-between cursor-pointer pl-4 border-l-2 border-border">
                <span className="text-sm text-text-secondary">同时显示 TID</span>
                <input
                  type="checkbox"
                  checked={settings.showTid}
                  onChange={(e) =>
                    updateSettings({ showTid: e.target.checked })
                  }
                  className="w-4 h-4 accent-accent cursor-pointer"
                />
              </label>
            )}
          </div>

          {/* Package/Process Name Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Monitor className="w-4 h-4" />
              <span className="font-medium">包名 / 进程名</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-secondary">显示包名</span>
              <input
                type="checkbox"
                checked={settings.showPackageName}
                onChange={(e) =>
                  updateSettings({ showPackageName: e.target.checked })
                }
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>

            {settings.showPackageName && (
              <label className="flex items-center justify-between cursor-pointer pl-4 border-l-2 border-border">
                <span className="text-sm text-text-secondary">隐藏重复的包名</span>
                <input
                  type="checkbox"
                  checked={settings.hideRepeatedPackageName}
                  onChange={(e) =>
                    updateSettings({ hideRepeatedPackageName: e.target.checked })
                  }
                  className="w-4 h-4 accent-accent cursor-pointer"
                />
              </label>
            )}

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-secondary">显示进程名</span>
              <input
                type="checkbox"
                checked={settings.showProcessName}
                onChange={(e) =>
                  updateSettings({ showProcessName: e.target.checked })
                }
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>

            {settings.showProcessName && (
              <label className="flex items-center justify-between cursor-pointer pl-4 border-l-2 border-border">
                <span className="text-sm text-text-secondary">隐藏重复的进程名</span>
                <input
                  type="checkbox"
                  checked={settings.hideRepeatedProcessName}
                  onChange={(e) =>
                    updateSettings({ hideRepeatedProcessName: e.target.checked })
                  }
                  className="w-4 h-4 accent-accent cursor-pointer"
                />
              </label>
            )}
          </div>

          {/* TAG Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Tag className="w-4 h-4" />
              <span className="font-medium">TAG</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-secondary">显示 TAG</span>
              <input
                type="checkbox"
                checked={settings.showTag}
                onChange={(e) =>
                  updateSettings({ showTag: e.target.checked })
                }
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>

            {settings.showTag && (
              <label className="flex items-center justify-between cursor-pointer pl-4 border-l-2 border-border">
                <span className="text-sm text-text-secondary">隐藏重复的 TAG</span>
                <input
                  type="checkbox"
                  checked={settings.hideRepeatedTags}
                  onChange={(e) =>
                    updateSettings({ hideRepeatedTags: e.target.checked })
                  }
                  className="w-4 h-4 accent-accent cursor-pointer"
                />
              </label>
            )}
          </div>

          {/* Level Settings */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-primary font-medium">显示 LEVEL</span>
              <input
                type="checkbox"
                checked={settings.showLevel}
                onChange={(e) =>
                  updateSettings({ showLevel: e.target.checked })
                }
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>
          </div>

          {/* Max Log Lines */}
          <div className="space-y-2">
            <div className="text-text-primary font-medium">最大日志条数</div>
            <select
              value={settings.maxLogLines}
              onChange={(e) =>
                updateSettings({ maxLogLines: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
            >
              <option value={10000}>10,000</option>
              <option value={50000}>50,000</option>
              <option value={100000}>100,000</option>
              <option value={500000}>500,000</option>
              <option value={1000000}>1,000,000</option>
            </select>
            <p className="text-xs text-text-muted">
              超过此数量时，旧日志将被自动删除
            </p>
          </div>

          {/* Reset */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={() => {
                updateSettings({
                  theme: "dark",
                  fontSize: 12,
                  lineHeight: 1.5,
                  showTimestamp: true,
                  timestampFormat: "time",
                  showPid: true,
                  showTid: false,
                  showPackageName: true,
                  showProcessName: false,
                  hideRepeatedPackageName: false,
                  hideRepeatedProcessName: false,
                  showLevel: true,
                  showTag: true,
                  hideRepeatedTags: false,
                  maxLogLines: 100000,
                });
              }}
              className="w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-surface-secondary hover:bg-surface rounded-md transition-colors"
            >
              恢复默认设置
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
