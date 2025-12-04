import React from "react";
import { X, Type, AlignJustify, Monitor } from "lucide-react";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";

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
      <div className="fixed right-0 top-0 h-full w-80 bg-surface-elevated border-l border-border shadow-xl z-50 animate-slide-in-right">
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
            <div className="flex justify-between text-xs text-text-muted">
              <span>10px</span>
              <span>20px</span>
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
            <div className="flex justify-between text-xs text-text-muted">
              <span>1.2</span>
              <span>2.5</span>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Monitor className="w-4 h-4" />
              <span className="font-medium">显示选项</span>
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

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-secondary">显示 TID</span>
              <input
                type="checkbox"
                checked={settings.showTid}
                onChange={(e) =>
                  updateSettings({ showTid: e.target.checked })
                }
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-secondary">显示 LEVEL</span>
              <input
                type="checkbox"
                checked={settings.showLevel}
                onChange={(e) =>
                  updateSettings({ showLevel: e.target.checked })
                }
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>

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
                  fontSize: 12,
                  lineHeight: 1.5,
                  showTimestamp: true,
                  showPid: true,
                  showTid: true,
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

