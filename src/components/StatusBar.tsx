import React from "react";
import {
  Pause,
  Play,
  Trash2,
  ArrowDown,
  Download,
  Circle,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { useLogStream } from "../hooks/useLogStream";
import { LOG_LEVEL_INFO, type LogLevel, type ExportFormat } from "../types";
import { downloadAsFile } from "../lib/utils";

export function StatusBar() {
  const {
    stats,
    isPaused,
    autoScroll,
    isConnected,
    filteredLogs,
    togglePause,
    setAutoScroll,
    clearLogs,
  } = useLogStore();

  const { selectedDevice, clearDeviceLogs } = useLogStream();

  const [showExportMenu, setShowExportMenu] = React.useState(false);

  const handleClear = async () => {
    if (selectedDevice) {
      await clearDeviceLogs(selectedDevice.id);
    } else {
      clearLogs();
    }
  };

  const handleExport = (format: ExportFormat) => {
    setShowExportMenu(false);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `logcat-${timestamp}`;

    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case "json":
        content = JSON.stringify(filteredLogs, null, 2);
        mimeType = "application/json";
        extension = "json";
        break;
      case "csv":
        const headers = "时间,PID,TID,级别,TAG,消息";
        const rows = filteredLogs.map(
          (log) =>
            `"${log.timestamp}",${log.pid},${log.tid},"${log.level}","${log.tag.replace(/"/g, '""')}","${log.message.replace(/"/g, '""')}"`
        );
        content = [headers, ...rows].join("\n");
        mimeType = "text/csv";
        extension = "csv";
        break;
      default:
        content = filteredLogs
          .map(
            (log) =>
              `${log.timestamp} ${log.pid} ${log.tid} ${log.level} ${log.tag}: ${log.message}`
          )
          .join("\n");
        mimeType = "text/plain";
        extension = "txt";
    }

    downloadAsFile(content, `${filename}.${extension}`, mimeType);
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

        {/* Clear */}
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-elevated text-text-secondary hover:text-log-error transition-colors"
          title="清空日志"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>清空</span>
        </button>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={filteredLogs.length === 0}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
              "hover:bg-surface-elevated text-text-secondary hover:text-text-primary",
              filteredLogs.length === 0 && "opacity-50 cursor-not-allowed"
            )}
            title="导出日志"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出</span>
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute bottom-full right-0 mb-1 bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1 animate-fade-in min-w-[120px]">
                <button
                  onClick={() => handleExport("txt")}
                  className="w-full px-3 py-1.5 text-left hover:bg-accent/10 transition-colors"
                >
                  导出为 TXT
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full px-3 py-1.5 text-left hover:bg-accent/10 transition-colors"
                >
                  导出为 JSON
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-3 py-1.5 text-left hover:bg-accent/10 transition-colors"
                >
                  导出为 CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

