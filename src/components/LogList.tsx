import React, { useRef, useEffect, useCallback, memo, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { LOG_LEVEL_INFO, type LogEntry, type LogLevel, type TimestampFormat } from "../types";

// Column width state
interface ColumnWidths {
  timestamp: number;
  pid: number;
  packageName: number;
  processName: number;
  level: number;
  tag: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  timestamp: 130,
  pid: 90,
  packageName: 180,
  processName: 120,
  level: 60,
  tag: 150,
};

// Minimum widths to ensure column headers don't wrap
const MIN_WIDTHS: ColumnWidths = {
  timestamp: 100, // "DATE/TIME" or "TIMESTAMP"
  pid: 80,        // "PID-TID"
  packageName: 90, // "PACKAGE"
  processName: 85, // "PROCESS"
  level: 60,      // "LEVEL"
  tag: 55,        // "TAG"
};

// Resizable column header component
const ResizableHeader = ({
  children,
  width,
  onResize,
  minWidth = 40,
}: {
  children: React.ReactNode;
  width: number;
  onResize: (delta: number) => void;
  minWidth?: number;
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    if (!isResizing) return;

    let rafId: number | null = null;
    let lastDelta = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      lastDelta = delta;

      // 使用 requestAnimationFrame 节流更新，减少重渲染
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          const newWidth = Math.max(minWidth, startWidthRef.current + lastDelta);
          onResize(newWidth - width);
          rafId = null;
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // 确保最后一次更新被应用
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        const newWidth = Math.max(minWidth, startWidthRef.current + lastDelta);
        onResize(newWidth - width);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isResizing, width, onResize, minWidth]);

  return (
    <div className="relative flex-shrink-0 border-r border-border group" style={{ width }}>
      {children}
      {/* Resize handle with balanced visibility */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-[10px] cursor-col-resize flex items-center justify-center z-10",
          "translate-x-1/2 transition-all duration-150",
          isResizing && "bg-blue-500/8",
          isHovering && !isResizing && "bg-blue-400/5"
        )}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        title="拖动调整列宽"
      >
        {/* Visible handle bar */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-150",
            isResizing
              ? "w-[2.5px] bg-blue-500 shadow-md"
              : isHovering
                ? "w-[2px] bg-blue-400/90"
                : "w-[1.5px] bg-gray-400/50 group-hover:bg-blue-400/60"
          )}
        />
      </div>
    </div>
  );
};

// Format timestamp based on settings
const formatTimestamp = (entry: LogEntry, format: TimestampFormat): string => {
  switch (format) {
    case "datetime":
      return entry.dateTime || entry.timestamp;
    case "epoch":
      return entry.epoch?.toString() || entry.timestamp;
    case "time":
    default:
      return entry.timestamp;
  }
};

// 自定义比较函数，优化 LogRow 的渲染判断
function arePropsEqual(
  prevProps: {
    entry: LogEntry;
    prevEntry: LogEntry | null;
    settings: any;
    columnWidths: ColumnWidths;
  },
  nextProps: {
    entry: LogEntry;
    prevEntry: LogEntry | null;
    settings: any;
    columnWidths: ColumnWidths;
  }
): boolean {
  // Entry 的 ID 相同且其他属性相同
  if (prevProps.entry.id !== nextProps.entry.id) {
    return false;
  }

  // 前一个 entry 的变化（用于判断重复显示）
  if (prevProps.prevEntry?.id !== nextProps.prevEntry?.id) {
    return false;
  }

  // Settings 对象引用变化（已被 useMemo 优化，只需比较引用）
  if (prevProps.settings !== nextProps.settings) {
    return false;
  }

  // ColumnWidths 浅比较（只比较实际使用的列）
  const cols: (keyof ColumnWidths)[] = ['timestamp', 'pid', 'packageName', 'processName', 'level', 'tag'];
  for (const col of cols) {
    if (prevProps.columnWidths[col] !== nextProps.columnWidths[col]) {
      return false;
    }
  }

  return true;
}

// Memoized log row component
const LogRow = memo(function LogRow({
  entry,
  prevEntry,
  settings,
  columnWidths,
}: {
  entry: LogEntry;
  prevEntry: LogEntry | null;
  settings: {
    showTimestamp: boolean;
    timestampFormat: TimestampFormat;
    showPid: boolean;
    showTid: boolean;
    showPackageName: boolean;
    showProcessName: boolean;
    hideRepeatedPackageName: boolean;
    hideRepeatedProcessName: boolean;
    showLevel: boolean;
    showTag: boolean;
    hideRepeatedTags: boolean;
    fontSize: number;
    lineHeight: number;
    wrapLines: boolean;
  };
  columnWidths: ColumnWidths;
}) {
  // System marker special rendering
  if (entry.isSystemMarker) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border-l-4 border-blue-500">
        <span className="text-sm text-blue-400 font-medium">
          {entry.message}
        </span>
      </div>
    );
  }

  const levelInfo = LOG_LEVEL_INFO[entry.level];
  
  // Check if values are repeated
  const isTagRepeated = settings.hideRepeatedTags && prevEntry && prevEntry.tag === entry.tag;
  const isPackageNameRepeated = settings.hideRepeatedPackageName && prevEntry && prevEntry.packageName === entry.packageName;
  const isProcessNameRepeated = settings.hideRepeatedProcessName && prevEntry && prevEntry.processName === entry.processName;

  const getRowClassName = (level: LogLevel) => {
    switch (level) {
      case "W":
        return "log-row-warn";
      case "E":
        return "log-row-error";
      case "A":
        return "log-row-assert";
      default:
        return "";
    }
  };

  // Format PID/TID display
  const formatPidTid = () => {
    if (settings.showTid) {
      return `${entry.pid}-${entry.tid}`;
    }
    return entry.pid.toString();
  };

  return (
    <div
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: `${settings.lineHeight}`,
      }}
      className={cn(
        "flex font-mono hover:bg-surface-elevated/50 transition-colors",
        settings.wrapLines ? "items-start" : "items-center",
        getRowClassName(entry.level)
      )}
    >
      {/* Timestamp */}
      {settings.showTimestamp && (
        <div
          className="flex-shrink-0 px-2 text-text-muted whitespace-nowrap overflow-hidden"
          style={{ width: columnWidths.timestamp }}
        >
          {formatTimestamp(entry, settings.timestampFormat)}
        </div>
      )}

      {/* PID (with optional TID) */}
      {settings.showPid && (
        <div
          className="flex-shrink-0 px-2 text-text-muted text-right whitespace-nowrap overflow-hidden"
          style={{ width: columnWidths.pid }}
        >
          {formatPidTid()}
        </div>
      )}

      {/* Package Name */}
      {settings.showPackageName && (
        <div
          className="flex-shrink-0 px-2 text-text-secondary whitespace-nowrap overflow-hidden"
          style={{ width: columnWidths.packageName }}
          title={entry.packageName}
        >
          {isPackageNameRepeated ? "" : (entry.packageName || "-")}
        </div>
      )}

      {/* Process Name */}
      {settings.showProcessName && (
        <div
          className="flex-shrink-0 px-2 text-text-muted whitespace-nowrap overflow-hidden"
          style={{ width: columnWidths.processName }}
          title={entry.processName}
        >
          {isProcessNameRepeated ? "" : (entry.processName || "-")}
        </div>
      )}

      {/* Level */}
      {settings.showLevel && (
        <div
          className="flex-shrink-0 px-2 text-center font-bold whitespace-nowrap overflow-hidden"
          style={{ color: levelInfo.color, width: columnWidths.level }}
        >
          {entry.level}
        </div>
      )}

      {/* Tag */}
      {settings.showTag && (
        <div
          className="flex-shrink-0 px-2 whitespace-nowrap overflow-hidden"
          style={{
            color: isTagRepeated ? "transparent" : levelInfo.color,
            width: columnWidths.tag
          }}
          title={entry.tag}
        >
          {isTagRepeated ? "" : entry.tag}
        </div>
      )}

      {/* Message */}
      <div
        className={cn(
          "flex-1 min-w-[200px] px-2 text-text-primary",
          settings.wrapLines
            ? "whitespace-pre-wrap break-all"
            : "whitespace-pre"
        )}
      >
        {entry.message}
      </div>
    </div>
  );
}, arePropsEqual);

export function LogList() {
  const { filteredLogs, autoScroll, settings, filter, setAutoScroll } = useLogStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(0);
  const prevAutoScrollRef = useRef(autoScroll);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_WIDTHS);

  const handleColumnResize = (column: keyof ColumnWidths, delta: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [column]: prev[column] + delta,
    }));
  };

  // Virtual list configuration with dynamic height support
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => settings.wrapLines ? 60 : 28,
    overscan: 20,
    measureElement: (element) => {
      return element?.getBoundingClientRect().height ?? (settings.wrapLines ? 60 : 28);
    },
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (
      autoScroll &&
      filteredLogs.length > prevLogCountRef.current &&
      parentRef.current
    ) {
      virtualizer.scrollToIndex(filteredLogs.length - 1, {
        align: "end",
        behavior: "auto",
      });
    }
    prevLogCountRef.current = filteredLogs.length;
  }, [filteredLogs.length, autoScroll, virtualizer]);

  useEffect(() => {
    if (
      autoScroll &&
      !prevAutoScrollRef.current &&
      filteredLogs.length > 0
    ) {
      virtualizer.scrollToIndex(filteredLogs.length - 1, {
        align: "end",
        behavior: "smooth",
      });
    }
    prevAutoScrollRef.current = autoScroll;
  }, [autoScroll, filteredLogs.length, virtualizer]);

  // Handle scroll events from LeftToolbar
  useEffect(() => {
    const handleScrollToTop = () => {
      virtualizer.scrollToIndex(0, { align: "start", behavior: "smooth" });
    };
    
    const handleScrollToBottom = () => {
      if (filteredLogs.length > 0) {
        virtualizer.scrollToIndex(filteredLogs.length - 1, { align: "end", behavior: "smooth" });
      }
      setAutoScroll(true);
    };

    window.addEventListener("logcat:scrollToTop", handleScrollToTop);
    window.addEventListener("logcat:scrollToBottom", handleScrollToBottom);

    return () => {
      window.removeEventListener("logcat:scrollToTop", handleScrollToTop);
      window.removeEventListener("logcat:scrollToBottom", handleScrollToBottom);
    };
  }, [virtualizer, filteredLogs.length, setAutoScroll]);

  // Handle scroll（目前不再自动关闭自动滚动，只保留占位，方便未来扩展）
  const handleScroll = useCallback(() => {
    // no-op
  }, []);

  const rowSettings = useMemo(
    () => ({
      showTimestamp: settings.showTimestamp,
      timestampFormat: settings.timestampFormat,
      showPid: settings.showPid,
      showTid: settings.showTid,
      showPackageName: settings.showPackageName,
      showProcessName: settings.showProcessName,
      hideRepeatedPackageName: settings.hideRepeatedPackageName,
      hideRepeatedProcessName: settings.hideRepeatedProcessName,
      showLevel: settings.showLevel,
      showTag: settings.showTag,
      hideRepeatedTags: settings.hideRepeatedTags,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      wrapLines: settings.wrapLines,
    }),
    [
      settings.showTimestamp,
      settings.timestampFormat,
      settings.showPid,
      settings.showTid,
      settings.showPackageName,
      settings.showProcessName,
      settings.hideRepeatedPackageName,
      settings.hideRepeatedProcessName,
      settings.showLevel,
      settings.showTag,
      settings.hideRepeatedTags,
      settings.fontSize,
      settings.lineHeight,
      settings.wrapLines,
    ]
  );

  // Calculate minimum content width based on column widths
  const minContentWidth = useMemo(
    () =>
      (settings.showTimestamp ? columnWidths.timestamp : 0) +
      (settings.showPid ? columnWidths.pid : 0) +
      (settings.showPackageName ? columnWidths.packageName : 0) +
      (settings.showProcessName ? columnWidths.processName : 0) +
      (settings.showLevel ? columnWidths.level : 0) +
      (settings.showTag ? columnWidths.tag : 0) +
      500,
    [
      columnWidths.level,
      columnWidths.packageName,
      columnWidths.pid,
      columnWidths.processName,
      columnWidths.tag,
      columnWidths.timestamp,
      settings.showLevel,
      settings.showPackageName,
      settings.showPid,
      settings.showProcessName,
      settings.showTag,
      settings.showTimestamp,
    ]
  );

  // 使用 useRef 跟踪列宽，避免频繁重测量
  const columnWidthsRef = useRef(columnWidths);
  const measureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    columnWidthsRef.current = columnWidths;
  }, [columnWidths]);

  useEffect(() => {
    // 立即测量字体和换行相关的变化
    virtualizer.measure();
  }, [
    virtualizer,
    settings.wrapLines,
    settings.fontSize,
    settings.lineHeight,
  ]);

  // 延迟测量列宽变化，避免拖动时频繁重测量
  useEffect(() => {
    if (measureTimeoutRef.current) {
      clearTimeout(measureTimeoutRef.current);
    }

    measureTimeoutRef.current = setTimeout(() => {
      virtualizer.measure();
    }, 100); // 100ms 防抖延迟

    return () => {
      if (measureTimeoutRef.current) {
        clearTimeout(measureTimeoutRef.current);
      }
    };
  }, [
    virtualizer,
    columnWidths.timestamp,
    columnWidths.pid,
    columnWidths.packageName,
    columnWidths.processName,
    columnWidths.level,
    columnWidths.tag,
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface transition-theme overflow-hidden">
      {/* Scrollable container for both header and content */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto min-h-0"
        onScroll={handleScroll}
      >
        {/* Inner container with min-width for horizontal scroll */}
        <div style={{ minWidth: settings.wrapLines ? undefined : minContentWidth }}>
          {/* Column Headers - sticky */}
          <div
            className="flex items-center font-mono text-xs font-semibold bg-surface-secondary border-b border-border sticky top-0 z-10 select-none"
            style={{ fontSize: `${settings.fontSize}px` }}
          >
            {settings.showTimestamp && (
              <ResizableHeader
                width={columnWidths.timestamp}
                onResize={(delta) => handleColumnResize("timestamp", delta)}
                minWidth={MIN_WIDTHS.timestamp}
              >
                <div className="px-2 py-2 text-text-secondary whitespace-nowrap overflow-hidden">
                  {settings.timestampFormat === "datetime" ? "DATE/TIME" : 
                   settings.timestampFormat === "epoch" ? "TIMESTAMP" : "TIME"}
                </div>
              </ResizableHeader>
            )}
            {settings.showPid && (
              <ResizableHeader
                width={columnWidths.pid}
                onResize={(delta) => handleColumnResize("pid", delta)}
                minWidth={MIN_WIDTHS.pid}
              >
                <div className="px-2 py-2 text-text-secondary text-right whitespace-nowrap overflow-hidden">
                  {settings.showTid ? "PID-TID" : "PID"}
                </div>
              </ResizableHeader>
            )}
            {settings.showPackageName && (
              <ResizableHeader
                width={columnWidths.packageName}
                onResize={(delta) => handleColumnResize("packageName", delta)}
                minWidth={MIN_WIDTHS.packageName}
              >
                <div className="px-2 py-2 text-text-secondary whitespace-nowrap overflow-hidden">PACKAGE</div>
              </ResizableHeader>
            )}
            {settings.showProcessName && (
              <ResizableHeader
                width={columnWidths.processName}
                onResize={(delta) => handleColumnResize("processName", delta)}
                minWidth={MIN_WIDTHS.processName}
              >
                <div className="px-2 py-2 text-text-secondary whitespace-nowrap overflow-hidden">PROCESS</div>
              </ResizableHeader>
            )}
            {settings.showLevel && (
              <ResizableHeader
                width={columnWidths.level}
                onResize={(delta) => handleColumnResize("level", delta)}
                minWidth={MIN_WIDTHS.level}
              >
                <div className="px-2 py-2 text-text-secondary text-center whitespace-nowrap overflow-hidden">LEVEL</div>
              </ResizableHeader>
            )}
            {settings.showTag && (
              <ResizableHeader
                width={columnWidths.tag}
                onResize={(delta) => handleColumnResize("tag", delta)}
                minWidth={MIN_WIDTHS.tag}
              >
                <div className="px-2 py-2 text-text-secondary whitespace-nowrap overflow-hidden">TAG</div>
              </ResizableHeader>
            )}
            <div className="flex-1 min-w-[200px] px-2 py-2 text-text-secondary whitespace-nowrap">MESSAGE</div>
          </div>

          {/* Virtual List Content */}
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-[400px] text-text-muted">
              <div className="text-center">
                <div className="text-4xl mb-4">📋</div>
                <div className="text-lg">暂无日志</div>
                <div className="text-sm mt-2">连接设备后日志将显示在这里</div>
              </div>
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const entry = filteredLogs[virtualRow.index];
                const prevEntry = virtualRow.index > 0 ? filteredLogs[virtualRow.index - 1] : null;
                return (
                  <div
                    key={entry.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <LogRow
                      entry={entry}
                      prevEntry={prevEntry}
                      settings={rowSettings}
                      columnWidths={columnWidths}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
