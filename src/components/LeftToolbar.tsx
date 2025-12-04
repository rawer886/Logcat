import React, { useRef } from "react";
import {
  Trash2,
  Pause,
  Play,
  ArrowDown,
  ArrowUp,
  WrapText,
  Upload,
  Download,
} from "lucide-react";
import { cn, downloadAsFile, importLogs, exportToAndroidStudioFormat } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { useLogStream } from "../hooks/useLogStream";

export function LeftToolbar() {
  const {
    isPaused,
    autoScroll,
    filteredLogs,
    filter,
    settings,
    togglePause,
    setAutoScroll,
    clearLogs,
    updateSettings,
    importLogs: importLogsToStore,
  } = useLogStore();

  const { selectedDevice, clearDeviceLogs, stopLogcat, isConnected } = useLogStream();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = async () => {
    if (selectedDevice) {
      await clearDeviceLogs(selectedDevice.id);
    } else {
      clearLogs();
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (isConnected) {
        await stopLogcat();
      }

      const content = await file.text();
      const result = importLogs(content, file.name);

      if (result.logs.length === 0) {
        alert("无法解析日志文件，请检查文件格式是否正确。");
        return;
      }

      importLogsToStore(result.logs, file.name);
      console.log(`成功导入 ${result.logs.length} 条日志`);
    } catch (error) {
      console.error("导入失败:", error);
      alert("导入失败，请检查文件格式。");
    }

    e.target.value = "";
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const deviceName = selectedDevice?.name?.replace(/\s+/g, "-") || "Unknown";
    const filename = `${deviceName}_${timestamp}.logcat`;

    const content = exportToAndroidStudioFormat(
      filteredLogs,
      selectedDevice,
      filter.searchText
    );

    downloadAsFile(content, filename, "application/json");
  };

  const scrollToTop = () => {
    // Dispatch custom event for LogList to handle
    window.dispatchEvent(new CustomEvent("logcat:scrollToTop"));
  };

  const scrollToBottom = () => {
    // Dispatch custom event for LogList to handle
    window.dispatchEvent(new CustomEvent("logcat:scrollToBottom"));
  };

  return (
    <div className="flex flex-col items-center py-2 px-1 bg-surface-secondary border-r border-border gap-1">
      {/* Clear */}
      <ToolButton
        icon={Trash2}
        onClick={handleClear}
        title="清空日志"
        className="hover:text-log-error"
      />

      <div className="w-6 border-t border-border my-1" />

      {/* Pause/Resume */}
      <ToolButton
        icon={isPaused ? Play : Pause}
        onClick={togglePause}
        title={isPaused ? "恢复" : "暂停"}
        active={isPaused}
        activeColor="text-log-warn"
      />

      <div className="w-6 border-t border-border my-1" />

      {/* Scroll to Top */}
      <ToolButton
        icon={ArrowUp}
        onClick={scrollToTop}
        title="滚动到顶部"
      />

      {/* Scroll to Bottom */}
      <ToolButton
        icon={ArrowDown}
        onClick={scrollToBottom}
        title="滚动到底部"
      />

      {/* Auto Scroll Toggle */}
      <ToolButton
        icon={ArrowDown}
        onClick={() => setAutoScroll(!autoScroll)}
        title={autoScroll ? "自动滚动已开启" : "自动滚动已关闭"}
        active={autoScroll}
        badge={autoScroll}
      />

      <div className="w-6 border-t border-border my-1" />

      {/* Wrap Lines */}
      <ToolButton
        icon={WrapText}
        onClick={() => updateSettings({ wrapLines: !settings.wrapLines })}
        title={settings.wrapLines ? "自动换行已开启" : "自动换行已关闭"}
        active={settings.wrapLines}
      />

      <div className="flex-1" />

      {/* Import */}
      <ToolButton
        icon={Upload}
        onClick={handleImport}
        title="导入日志"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".logcat,.txt,.log,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Export */}
      <ToolButton
        icon={Download}
        onClick={handleExport}
        title="导出日志 (.logcat)"
        disabled={filteredLogs.length === 0}
      />
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  title: string;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  className?: string;
  badge?: boolean;
}

function ToolButton({
  icon: Icon,
  onClick,
  title,
  active = false,
  activeColor = "text-accent",
  disabled = false,
  className = "",
  badge = false,
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative p-1.5 rounded transition-colors",
        active
          ? `bg-accent/20 ${activeColor}`
          : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={title}
    >
      <Icon className="w-4 h-4" />
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
      )}
    </button>
  );
}

