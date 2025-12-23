import React, { useState, useMemo, useEffect } from "react";
import { Type, Monitor, Clock, Hash, Tag, Sun, Moon, Laptop, Settings, Palette, Columns, SlidersHorizontal, Info, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import type { TimestampFormat, FontFamily, AppSettings } from "../types";

// 选项卡类型
type SettingsTab = "appearance" | "columns" | "other" | "about";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// 设置分组卡片组件
function SettingSection({
  icon: Icon,
  title,
  children
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border/50 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-surface-secondary/50 border-b border-border/50">
        <Icon className="w-4 h-4 text-accent" />
        <span className="font-medium text-text-primary text-sm">{title}</span>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

// 开关行组件
function ToggleRow({
  label,
  checked,
  onChange,
  indent = false
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  indent?: boolean;
}) {
  return (
    <label className={cn(
      "flex items-center justify-between cursor-pointer py-1 group",
      indent && "pl-3 border-l-2 border-accent/30 ml-1"
    )}>
      <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-surface-secondary rounded-full peer peer-checked:bg-accent transition-colors duration-200" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-4" />
      </div>
    </label>
  );
}

// 数字输入组件
function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  indent = false
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  indent?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between",
      indent && "pl-3 border-l-2 border-accent/30 ml-1"
    )}>
      <span className="text-sm text-text-secondary">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        className="w-16 px-2 py-1.5 text-sm text-center bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
      />
    </div>
  );
}

// 比较两个设置对象的指定字段是否相同
function compareSettings(a: AppSettings, b: AppSettings, keys: (keyof AppSettings)[]): boolean {
  return keys.every(key => a[key] === b[key]);
}

// 外观选项卡的设置字段
const APPEARANCE_KEYS: (keyof AppSettings)[] = ["theme", "fontFamily", "fontSize", "lineHeight"];

// 显示列选项卡的设置字段
const COLUMNS_KEYS: (keyof AppSettings)[] = [
  "showTimestamp", "timestampFormat", "showPid", "showTid",
  "showPackageName", "showProcessName", "showRepeatedPackageName", "showRepeatedProcessName",
  "showLevel", "showTag", "showRepeatedTags",
  "tagColumnWidth", "packageColumnWidth", "processColumnWidth"
];

// 其他选项卡的设置字段
const OTHER_KEYS: (keyof AppSettings)[] = ["maxLogLines"];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useLogStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  // 保存打开弹窗时的初始设置（用于取消时恢复）
  const [savedSettings, setSavedSettings] = useState<AppSettings>(settings);

  // 草稿设置：用户修改但尚未应用的设置
  const [draftSettings, setDraftSettings] = useState<AppSettings>(settings);

  // 当弹窗打开时，保存当前设置作为基准，并初始化草稿
  useEffect(() => {
    if (isOpen) {
      setSavedSettings({ ...settings });
      setDraftSettings({ ...settings });
    }
  }, [isOpen]);

  // 监听 ESC 键关闭弹窗
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 更新草稿设置的辅助函数
  const updateDraftSettings = (updates: Partial<AppSettings>) => {
    setDraftSettings(prev => ({ ...prev, ...updates }));
  };

  // 判断各选项卡是否有未保存的修改（比较草稿与已保存设置）
  const hasAppearanceChanges = useMemo(() =>
    !compareSettings(draftSettings, savedSettings, APPEARANCE_KEYS),
    [draftSettings, savedSettings]
  );

  const hasColumnsChanges = useMemo(() =>
    !compareSettings(draftSettings, savedSettings, COLUMNS_KEYS),
    [draftSettings, savedSettings]
  );

  const hasOtherChanges = useMemo(() =>
    !compareSettings(draftSettings, savedSettings, OTHER_KEYS),
    [draftSettings, savedSettings]
  );

  // 当前选项卡是否有修改
  const hasCurrentTabChanges = useMemo(() => {
    switch (activeTab) {
      case "appearance": return hasAppearanceChanges;
      case "columns": return hasColumnsChanges;
      case "other": return hasOtherChanges;
      default: return false;
    }
  }, [activeTab, hasAppearanceChanges, hasColumnsChanges, hasOtherChanges]);

  // 应用当前选项卡的修改（将草稿设置应用到全局）
  const handleApply = () => {
    // 将草稿设置应用到全局 store
    updateSettings(draftSettings);
    // 更新已保存的设置为当前草稿设置
    setSavedSettings({ ...draftSettings });
  };

  // 确认所有修改（将草稿设置应用到全局并关闭）
  const handleConfirm = () => {
    // 将草稿设置应用到全局 store
    updateSettings(draftSettings);
    onClose();
  };

  // 取消修改，关闭弹窗（不应用任何更改）
  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "appearance" as const, label: "外观", icon: Palette },
    { id: "columns" as const, label: "显示列", icon: Columns },
    { id: "other" as const, label: "其他", icon: SlidersHorizontal },
    { id: "about" as const, label: "关于", icon: Info },
  ];

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-4xl bg-surface-elevated rounded-2xl shadow-2xl border border-border/50 pointer-events-auto animate-modal-in flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center px-6 py-4 border-b border-border/50 bg-surface-secondary/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Settings className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">设置</h2>
            </div>
          </div>

          {/* Main Content with Left Tabs */}
          <div className="flex min-h-[560px]">
            {/* Left Sidebar Tabs */}
            <div className="w-36 border-r border-border/50 bg-surface-secondary/20 py-2 flex-shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-accent/10 text-accent border-r-2 border-accent"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Right Content Area */}
            <div className="flex-1 p-5">
            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-5">
                {/* Restore Default Link */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      updateDraftSettings({
                        theme: "system",
                        fontFamily: "system",
                        fontSize: 12,
                        lineHeight: 1.2,
                      });
                    }}
                    className="text-sm text-accent hover:text-accent-hover hover:underline transition-colors"
                  >
                    恢复默认
                  </button>
                </div>

                {/* Theme Selection */}
                <SettingSection icon={Sun} title="主题">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "light", label: "浅色", icon: Sun },
                      { value: "dark", label: "深色", icon: Moon },
                      { value: "system", label: "跟随系统", icon: Laptop },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => updateDraftSettings({ theme: option.value as "light" | "dark" | "system" })}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200",
                            draftSettings.theme === option.value
                              ? "border-accent bg-accent/10 text-accent shadow-sm"
                              : "border-transparent bg-surface-secondary/50 hover:bg-surface-secondary text-text-secondary hover:text-text-primary"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </SettingSection>

                {/* Font Settings */}
                <SettingSection icon={Type} title="字体">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">字体</span>
                    <select
                      value={draftSettings.fontFamily}
                      onChange={(e) =>
                        updateDraftSettings({ fontFamily: e.target.value as FontFamily })
                      }
                      className="w-40 px-3 py-1.5 text-sm bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                    >
                      <option value="system">系统默认</option>
                      <option value="jetbrains-mono">JetBrains Mono</option>
                      <option value="fira-code">Fira Code</option>
                      <option value="source-code-pro">Source Code Pro</option>
                      <option value="consolas">Consolas</option>
                      <option value="menlo">Menlo</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">字号</span>
                    <input
                      type="number"
                      min="10"
                      max="20"
                      value={draftSettings.fontSize}
                      onChange={(e) =>
                        updateDraftSettings({ fontSize: Math.max(10, Math.min(20, parseInt(e.target.value) || 12)) })
                      }
                      className="w-40 px-2 py-1.5 text-sm text-center bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">行高</span>
                    <input
                      type="number"
                      min="1.0"
                      max="2.5"
                      step="0.1"
                      value={draftSettings.lineHeight}
                      onChange={(e) =>
                        updateDraftSettings({ lineHeight: Math.max(1.0, Math.min(2.5, parseFloat(e.target.value) || 1.2)) })
                      }
                      className="w-40 px-2 py-1.5 text-sm text-center bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                    />
                  </div>
                </SettingSection>
              </div>
            )}

            {/* Columns Tab */}
            {activeTab === "columns" && (
              <div className="space-y-4">
                {/* Restore Default Link */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      updateDraftSettings({
                        showTimestamp: true,
                        timestampFormat: "datetime",
                        showPid: true,
                        showTid: true,
                        showPackageName: true,
                        showProcessName: false,
                        showRepeatedPackageName: true,
                        showRepeatedProcessName: true,
                        showLevel: true,
                        showTag: true,
                        showRepeatedTags: true,
                        tagColumnWidth: 23,
                        packageColumnWidth: 35,
                        processColumnWidth: 35,
                      });
                    }}
                    className="text-sm text-accent hover:text-accent-hover hover:underline transition-colors"
                  >
                    恢复默认
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                {/* Timestamp Settings */}
                <SettingSection icon={Clock} title="时间戳">
                  <ToggleRow
                    label="显示时间戳"
                    checked={draftSettings.showTimestamp}
                    onChange={(checked) => updateDraftSettings({ showTimestamp: checked })}
                  />
                  {draftSettings.showTimestamp && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-accent/30 ml-1">
                      <div className="text-xs text-text-muted font-medium">时间格式</div>
                      <div className="flex flex-col gap-1">
                        {[
                          { value: "datetime", label: "日期 + 时间" },
                          { value: "time", label: "仅时间" },
                          { value: "epoch", label: "时间戳" },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200",
                              draftSettings.timestampFormat === option.value
                                ? "bg-accent/15"
                                : "hover:bg-surface-secondary"
                            )}
                          >
                            <input
                              type="radio"
                              name="timestampFormat"
                              value={option.value}
                              checked={draftSettings.timestampFormat === option.value}
                              onChange={(e) =>
                                updateDraftSettings({ timestampFormat: e.target.value as TimestampFormat })
                              }
                              className="accent-accent w-3.5 h-3.5"
                            />
                            <span className="text-sm text-text-primary">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </SettingSection>

                {/* Process ID Settings */}
                <SettingSection icon={Hash} title="进程 ID">
                  <ToggleRow
                    label="显示 PID"
                    checked={draftSettings.showPid}
                    onChange={(checked) => updateDraftSettings({ showPid: checked })}
                  />
                  {draftSettings.showPid && (
                    <ToggleRow
                      label="同时显示 TID"
                      checked={draftSettings.showTid}
                      onChange={(checked) => updateDraftSettings({ showTid: checked })}
                      indent
                    />
                  )}
                </SettingSection>

                {/* Level Settings */}
                <SettingSection icon={Settings} title="级别">
                  <ToggleRow
                    label="显示 LEVEL"
                    checked={draftSettings.showLevel}
                    onChange={(checked) => updateDraftSettings({ showLevel: checked })}
                  />
                </SettingSection>

                {/* TAG Settings */}
                <SettingSection icon={Tag} title="TAG">
                  <ToggleRow
                    label="显示 TAG"
                    checked={draftSettings.showTag}
                    onChange={(checked) => updateDraftSettings({ showTag: checked })}
                  />
                  {draftSettings.showTag && (
                    <>
                      <NumberInput
                        label="列宽（字符数）"
                        value={draftSettings.tagColumnWidth}
                        onChange={(value) => updateDraftSettings({ tagColumnWidth: value })}
                        min={10}
                        max={100}
                        indent
                      />
                      <ToggleRow
                        label="展示重复的 TAG"
                        checked={draftSettings.showRepeatedTags}
                        onChange={(checked) => updateDraftSettings({ showRepeatedTags: checked })}
                        indent
                      />
                    </>
                  )}
                </SettingSection>

                {/* Package Name Settings */}
                <SettingSection icon={Monitor} title="包名">
                  <ToggleRow
                    label="显示包名"
                    checked={draftSettings.showPackageName}
                    onChange={(checked) => updateDraftSettings({ showPackageName: checked })}
                  />
                  {draftSettings.showPackageName && (
                    <>
                      <NumberInput
                        label="列宽（字符数）"
                        value={draftSettings.packageColumnWidth}
                        onChange={(value) => updateDraftSettings({ packageColumnWidth: value })}
                        min={10}
                        max={100}
                        indent
                      />
                      <ToggleRow
                        label="展示重复的包名"
                        checked={draftSettings.showRepeatedPackageName}
                        onChange={(checked) => updateDraftSettings({ showRepeatedPackageName: checked })}
                        indent
                      />
                    </>
                  )}
                </SettingSection>

                {/* Process Name Settings */}
                <SettingSection icon={Monitor} title="进程名">
                  <ToggleRow
                    label="显示进程名"
                    checked={draftSettings.showProcessName}
                    onChange={(checked) => updateDraftSettings({ showProcessName: checked })}
                  />
                  {draftSettings.showProcessName && (
                    <>
                      <NumberInput
                        label="列宽（字符数）"
                        value={draftSettings.processColumnWidth}
                        onChange={(value) => updateDraftSettings({ processColumnWidth: value })}
                        min={10}
                        max={100}
                        indent
                      />
                      <ToggleRow
                        label="展示重复的进程名"
                        checked={draftSettings.showRepeatedProcessName}
                        onChange={(checked) => updateDraftSettings({ showRepeatedProcessName: checked })}
                        indent
                      />
                    </>
                  )}
                </SettingSection>
                </div>
              </div>
            )}

            {/* Other Tab */}
            {activeTab === "other" && (
              <div className="space-y-5">
                <SettingSection icon={SlidersHorizontal} title="性能">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-text-secondary">最大日志条数</span>
                      <p className="text-xs text-text-muted mt-0.5">超过限制时自动删除旧日志</p>
                    </div>
                    <select
                      value={draftSettings.maxLogLines}
                      onChange={(e) =>
                        updateDraftSettings({ maxLogLines: parseInt(e.target.value) })
                      }
                      className="w-28 px-3 py-1.5 text-sm bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                    >
                      <option value={10000}>10,000</option>
                      <option value={50000}>50,000</option>
                      <option value={100000}>100,000</option>
                      <option value={500000}>500,000</option>
                      <option value={1000000}>1,000,000</option>
                    </select>
                  </div>
                </SettingSection>

              </div>
            )}

            {/* About Tab */}
            {activeTab === "about" && (
              <div className="space-y-5">
                {/* App Info */}
                <SettingSection icon={Info} title="应用信息">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">应用名称</span>
                      <span className="text-sm text-text-primary font-medium">Logcat Viewer</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">版本</span>
                      <span className="text-sm text-text-primary font-medium">v0.1.0</span>
                    </div>
                  </div>
                </SettingSection>

                {/* Update */}
                <SettingSection icon={RefreshCw} title="更新">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-text-secondary">当前版本已是最新</span>
                      <p className="text-xs text-text-muted mt-0.5">上次检查：从未</p>
                    </div>
                    <button
                      onClick={() => {
                        // TODO: 实现检测更新功能
                        console.log("Check for updates...");
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-secondary rounded-lg border border-border/50 transition-all duration-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      检测更新
                    </button>
                  </div>
                </SettingSection>

                {/* Links */}
                <SettingSection icon={Info} title="链接">
                  <div className="space-y-2">
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-secondary transition-colors group"
                    >
                      <span className="text-sm text-text-secondary group-hover:text-text-primary">GitHub 仓库</span>
                      <span className="text-xs text-accent">访问 →</span>
                    </a>
                    <a
                      href="https://github.com/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-secondary transition-colors group"
                    >
                      <span className="text-sm text-text-secondary group-hover:text-text-primary">问题反馈</span>
                      <span className="text-xs text-accent">访问 →</span>
                    </a>
                  </div>
                </SettingSection>
              </div>
            )}
            </div>
          </div>

          {/* Footer with Buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50 bg-surface-secondary/30">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-secondary rounded-lg border border-border/50 transition-all duration-200"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              disabled={!hasCurrentTabChanges}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
                hasCurrentTabChanges
                  ? "text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-secondary border-border/50 cursor-pointer"
                  : "text-text-muted bg-surface-secondary/50 border-border/30 cursor-not-allowed opacity-50"
              )}
            >
              应用
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all duration-200"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
