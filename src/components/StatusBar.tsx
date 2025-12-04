import React, { useRef } from "react";
import {
  Pause,
  Play,
  Trash2,
  ArrowDown,
  Download,
  Upload,
  Circle,
  WrapText,
} from "lucide-react";
import { cn, downloadAsFile, importLogs, exportToAndroidStudioFormat } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { useLogStream } from "../hooks/useLogStream";
import { LOG_LEVEL_INFO, type LogLevel } from "../types";

export function StatusBar() {
  const {
    stats,
    isPaused,
    autoScroll,
    isConnected,
    filteredLogs,
    filter,
    settings,
    togglePause,
    setAutoScroll,
    clearLogs,
    updateSettings,
    importLogs: importLogsToStore,
  } = useLogStore();

  const { selectedDevice, clearDeviceLogs, stopLogcat } = useLogStream();

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
      // Stop current logcat if running
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
      
      const formatName = result.format === "logcat" ? "Android Studio .logcat" : "文本格式";
      console.log(`成功导入 ${result.logs.length} 条日志 (${formatName})`);
    } catch (error) {
      console.error("导入失败:", error);
      alert("导入失败，请检查文件格式。");
    }

    // Reset file input
    e.target.value = "";
  };

  const handleExport = () => {
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

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-surface-secondary border-t border-border text-xs transition-theme">
      {/* Left: Stats */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          <Circle
            className={cn(
              "w-2 h-2",
              isConnected ? "fill-log-info text-log-info" : "fill-text-muted text-text-muted"
            )}
          />
          <span className="text-text-secondary">
            {isConnected ? "已连接" : "未连接"}
          </span>
        </div>

        {/* Log Counts */}
        <div className="flex items-center gap-3 text-text-secondary">
          <span>
            共 <span className="text-text-primary font-medium">{stats.total.toLocaleString()}</span> 条
          </span>
          {stats.filtered !== stats.total && (
            <span>
              已过滤: <span className="text-text-primary font-medium">{stats.filtered.toLocaleString()}</span> 条
            </span>
          )}
        </div>

        {/* Level Breakdown */}
        <div className="flex items-center gap-2">
          {(["E", "W", "I", "D", "V"] as LogLevel[]).map((level) => {
            const count = stats.byLevel[level];
            if (count === 0) return null;
            return (
              <span
                key={level}
                className="flex items-center gap-1"
                style={{ color: LOG_LEVEL_INFO[level].color }}
              >
                <span className="font-bold">{level}</span>
                <span>{count.toLocaleString()}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Pause/Resume */}
        <button
          onClick={togglePause}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
            isPaused
              ? "bg-log-warn/20 text-log-warn hover:bg-log-warn/30"
              : "hover:bg-surface-elevated text-text-secondary hover:text-text-primary"
          )}
          title={isPaused ? "恢复" : "暂停"}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>已暂停</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>暂停</span>
            </>
          )}
        </button>

        {/* Auto Scroll */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
            autoScroll
              ? "bg-accent/20 text-accent"
              : "hover:bg-surface-elevated text-text-secondary hover:text-text-primary"
          )}
          title={autoScroll ? "自动滚动已开启" : "自动滚动已关闭"}
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>自动滚动</span>
        </button>

        {/* Wrap Lines */}
        <button
          onClick={() => updateSettings({ wrapLines: !settings.wrapLines })}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
            settings.wrapLines
              ? "bg-accent/20 text-accent"
              : "hover:bg-surface-elevated text-text-secondary hover:text-text-primary"
          )}
          title={settings.wrapLines ? "自动换行已开启" : "自动换行已关闭"}
        >
          <WrapText className="w-3.5 h-3.5" />
          <span>换行</span>
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-elevated text-text-secondary hover:text-log-error transition-colors"
          title="清空日志"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>清空</span>
        </button>

        {/* Import */}
        <button
          onClick={handleImport}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
          title="导入日志"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>导入</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".logcat,.txt,.log,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={filteredLogs.length === 0}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
            "hover:bg-surface-elevated text-text-secondary hover:text-text-primary",
            filteredLogs.length === 0 && "opacity-50 cursor-not-allowed"
          )}
          title="导出日志 (.logcat)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>导出</span>
        </button>
      </div>
    </div>
  );
}

