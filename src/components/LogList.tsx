import React, { useRef, useEffect, memo, useState, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { LOG_LEVEL_INFO, type LogEntry, type LogLevel, type TimestampFormat } from "../types";

// 显示行类型：主行或续行
interface DisplayRow {
  type: "main" | "continuation";
  entry: LogEntry;
  prevEntry: LogEntry | null;
  messageSlice: string; // 当前行显示的消息片段
}

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
    displayRow: DisplayRow;
    settings: any;
    columnWidths: ColumnWidths;
    metaWidth: number;
  },
  nextProps: {
    displayRow: DisplayRow;
    settings: any;
    columnWidths: ColumnWidths;
    metaWidth: number;
  }
): boolean {
  // DisplayRow 比较
  if (prevProps.displayRow.type !== nextProps.displayRow.type) return false;
  if (prevProps.displayRow.entry.id !== nextProps.displayRow.entry.id) return false;
  if (prevProps.displayRow.messageSlice !== nextProps.displayRow.messageSlice) return false;
  if (prevProps.displayRow.prevEntry?.id !== nextProps.displayRow.prevEntry?.id) return false;

  // Settings 对象引用变化（已被 useMemo 优化，只需比较引用）
  if (prevProps.settings !== nextProps.settings) return false;

  // metaWidth
  if (prevProps.metaWidth !== nextProps.metaWidth) return false;

  // ColumnWidths 浅比较
  const cols: (keyof ColumnWidths)[] = ['timestamp', 'pid', 'packageName', 'processName', 'level', 'tag'];
  for (const col of cols) {
    if (prevProps.columnWidths[col] !== nextProps.columnWidths[col]) return false;
  }

  return true;
}

// Memoized log row component - 支持主行和续行
const LogRow = memo(function LogRow({
  displayRow,
  settings,
  columnWidths,
  metaWidth,
}: {
  displayRow: DisplayRow;
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
  metaWidth: number; // 元数据列的总宽度
}) {
  const { type, entry, prevEntry, messageSlice } = displayRow;

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

  // Check if values are repeated (only for main rows)
  const isTagRepeated = type === "main" && settings.hideRepeatedTags && prevEntry && prevEntry.tag === entry.tag;
  const isPackageNameRepeated = type === "main" && settings.hideRepeatedPackageName && prevEntry && prevEntry.packageName === entry.packageName;
  const isProcessNameRepeated = type === "main" && settings.hideRepeatedProcessName && prevEntry && prevEntry.processName === entry.processName;

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

  // 续行：只显示消息，前面用空白占位
  if (type === "continuation") {
    return (
      <div
        style={{ fontSize: `${settings.fontSize}px` }}
        className={cn(
          "flex font-mono hover:bg-surface-elevated/50 transition-colors items-center",
          getRowClassName(entry.level)
        )}
      >
        {/* 空白占位，宽度等于所有元数据列的总宽度 */}
        <div className="flex-shrink-0" style={{ width: metaWidth }} />
        {/* 续行消息 */}
        <div
          style={{ lineHeight: `${settings.lineHeight}` }}
          className="flex-1 min-w-[200px] px-2 text-text-primary whitespace-pre overflow-hidden"
        >
          {messageSlice}
        </div>
      </div>
    );
  }

  // 主行：显示所有列
  return (
    <div
      style={{ fontSize: `${settings.fontSize}px` }}
      className={cn(
        "flex font-mono hover:bg-surface-elevated/50 transition-colors items-center",
        getRowClassName(entry.level)
      )}
    >
      {/* Timestamp */}
      {settings.showTimestamp && (
        <div
          className="flex-shrink-0 px-2 text-text-muted overflow-hidden whitespace-nowrap"
          style={{ width: columnWidths.timestamp }}
        >
          {formatTimestamp(entry, settings.timestampFormat)}
        </div>
      )}

      {/* PID (with optional TID) */}
      {settings.showPid && (
        <div
          className="flex-shrink-0 px-2 text-text-muted text-right overflow-hidden whitespace-nowrap"
          style={{ width: columnWidths.pid }}
        >
          {formatPidTid()}
        </div>
      )}

      {/* Package Name */}
      {settings.showPackageName && (
        <div
          className="flex-shrink-0 px-2 text-text-secondary overflow-hidden whitespace-nowrap"
          style={{ width: columnWidths.packageName }}
          title={entry.packageName}
        >
          {isPackageNameRepeated ? "" : (entry.packageName || "-")}
        </div>
      )}

      {/* Process Name */}
      {settings.showProcessName && (
        <div
          className="flex-shrink-0 px-2 text-text-muted overflow-hidden whitespace-nowrap"
          style={{ width: columnWidths.processName }}
          title={entry.processName}
        >
          {isProcessNameRepeated ? "" : (entry.processName || "-")}
        </div>
      )}

      {/* Level */}
      {settings.showLevel && (
        <div
          className="flex-shrink-0 px-2 text-center font-bold overflow-hidden whitespace-nowrap"
          style={{ color: levelInfo.color, width: columnWidths.level }}
        >
          {entry.level}
        </div>
      )}

      {/* Tag */}
      {settings.showTag && (
        <div
          className="flex-shrink-0 px-2 overflow-hidden whitespace-nowrap"
          style={{
            color: isTagRepeated ? "transparent" : levelInfo.color,
            width: columnWidths.tag,
          }}
          title={entry.tag}
        >
          {isTagRepeated ? "" : entry.tag}
        </div>
      )}

      {/* Message */}
      <div
        style={{ lineHeight: `${settings.lineHeight}` }}
        className="flex-1 min-w-[200px] px-2 text-text-primary whitespace-pre overflow-hidden"
      >
        {messageSlice}
      </div>
    </div>
  );
}, arePropsEqual);

export function LogList() {
  const { filteredLogs, autoScroll, settings, setAutoScroll } = useLogStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(0);
  const prevAutoScrollRef = useRef(autoScroll);
  const lastScrollTopRef = useRef(0); // Track last scroll position to detect scroll direction
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_WIDTHS);
  const [containerWidth, setContainerWidth] = useState(1200); // 默认宽度

  const handleColumnResize = (column: keyof ColumnWidths, delta: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [column]: prev[column] + delta,
    }));
  };

  // 监听容器宽度变化
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const updateWidth = () => {
      setContainerWidth(element.clientWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  // 计算元数据列的总宽度
  const metaWidth = useMemo(() => {
    let width = 0;
    if (settings.showTimestamp) width += columnWidths.timestamp;
    if (settings.showPid) width += columnWidths.pid;
    if (settings.showPackageName) width += columnWidths.packageName;
    if (settings.showProcessName) width += columnWidths.processName;
    if (settings.showLevel) width += columnWidths.level;
    if (settings.showTag) width += columnWidths.tag;
    return width;
  }, [
    columnWidths,
    settings.showTimestamp,
    settings.showPid,
    settings.showPackageName,
    settings.showProcessName,
    settings.showLevel,
    settings.showTag,
  ]);

  // 计算消息列可用宽度
  const messageWidth = useMemo(() => {
    // 容器宽度 - 元数据宽度 - 滚动条宽度 - padding
    return Math.max(200, containerWidth - metaWidth - 20 - 16);
  }, [containerWidth, metaWidth]);

  // 估算每行可显示的字符数（基于等宽字体）
  const charsPerLine = useMemo(() => {
    // 等宽字体：字符宽度约为 fontSize * 0.6
    const charWidth = settings.fontSize * 0.6;
    return Math.floor(messageWidth / charWidth);
  }, [messageWidth, settings.fontSize]);

  // 将消息分割成多行
  const splitMessage = useCallback((message: string, maxChars: number): string[] => {
    if (message.length <= maxChars) {
      return [message];
    }

    const lines: string[] = [];
    let remaining = message;

    while (remaining.length > 0) {
      if (remaining.length <= maxChars) {
        lines.push(remaining);
        break;
      }

      // 在 maxChars 附近找合适的断点（空格、标点）
      let breakPoint = maxChars;

      // 尝试在单词边界断开
      const lastSpace = remaining.lastIndexOf(' ', maxChars);
      if (lastSpace > maxChars * 0.7) {
        breakPoint = lastSpace + 1;
      }

      lines.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint);
    }

    return lines;
  }, []);

  // 生成显示行数组
  const displayRows = useMemo((): DisplayRow[] => {
    if (!settings.wrapLines) {
      // 非换行模式：每个日志条目一行
      return filteredLogs.map((entry, index) => ({
        type: "main" as const,
        entry,
        prevEntry: index > 0 ? filteredLogs[index - 1] : null,
        messageSlice: entry.message,
      }));
    }

    // 换行模式：将长消息拆分成多行
    const rows: DisplayRow[] = [];

    filteredLogs.forEach((entry, index) => {
      const prevEntry = index > 0 ? filteredLogs[index - 1] : null;

      // System marker 不拆分
      if (entry.isSystemMarker) {
        rows.push({
          type: "main",
          entry,
          prevEntry,
          messageSlice: entry.message,
        });
        return;
      }

      const messageLines = splitMessage(entry.message, charsPerLine);

      messageLines.forEach((line, lineIndex) => {
        rows.push({
          type: lineIndex === 0 ? "main" : "continuation",
          entry,
          prevEntry: lineIndex === 0 ? prevEntry : null,
          messageSlice: line,
        });
      });
    });

    return rows;
  }, [filteredLogs, settings.wrapLines, charsPerLine, splitMessage]);

  // 计算固定行高 - 紧凑布局，只保留最小必要的 padding
  const fixedRowHeight = Math.max(22, Math.ceil(settings.fontSize * settings.lineHeight) + 4);

  // Virtual list configuration - 现在始终使用固定高度
  const virtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => fixedRowHeight,
    overscan: 30,
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (
      autoScroll &&
      displayRows.length > prevLogCountRef.current &&
      parentRef.current
    ) {
      virtualizer.scrollToIndex(displayRows.length - 1, {
        align: "end",
        behavior: "auto",
      });
      // Update lastScrollTopRef after auto-scroll to prevent disabling auto-scroll
      requestAnimationFrame(() => {
        if (parentRef.current) {
          lastScrollTopRef.current = parentRef.current.scrollTop;
        }
      });
    }
    prevLogCountRef.current = displayRows.length;
  }, [displayRows.length, autoScroll, virtualizer]);

  useEffect(() => {
    if (
      autoScroll &&
      !prevAutoScrollRef.current &&
      displayRows.length > 0
    ) {
      virtualizer.scrollToIndex(displayRows.length - 1, {
        align: "end",
        behavior: "auto",
      });
      // Update lastScrollTopRef when user manually enables auto-scroll
      requestAnimationFrame(() => {
        if (parentRef.current) {
          lastScrollTopRef.current = parentRef.current.scrollTop;
        }
      });
    }
    prevAutoScrollRef.current = autoScroll;
  }, [autoScroll, displayRows.length, virtualizer]);

  // Handle scroll events from LeftToolbar
  useEffect(() => {
    const handleScrollToTop = () => {
      virtualizer.scrollToIndex(0, {
        align: "start",
        behavior: "auto"
      });
    };

    const handleScrollToBottom = () => {
      if (displayRows.length > 0) {
        virtualizer.scrollToIndex(displayRows.length - 1, {
          align: "end",
          behavior: "auto"
        });
      }
      setAutoScroll(true);
      // Update lastScrollTopRef when scrolling to bottom
      requestAnimationFrame(() => {
        if (parentRef.current) {
          lastScrollTopRef.current = parentRef.current.scrollTop;
        }
      });
    };

    window.addEventListener("logcat:scrollToTop", handleScrollToTop);
    window.addEventListener("logcat:scrollToBottom", handleScrollToBottom);

    return () => {
      window.removeEventListener("logcat:scrollToTop", handleScrollToTop);
      window.removeEventListener("logcat:scrollToBottom", handleScrollToBottom);
    };
  }, [virtualizer, displayRows.length, setAutoScroll]);

  // Monitor scroll to disable auto-scroll when user scrolls up
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const handleScroll = () => {
      const currentScrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const lastScrollTop = lastScrollTopRef.current;

      // Get current autoScroll state from store
      const currentAutoScroll = useLogStore.getState().autoScroll;

      // Only process if auto-scroll is currently enabled
      if (currentAutoScroll) {
        // Calculate if user is near the bottom (within 100px)
        const isNearBottom = scrollHeight - clientHeight - currentScrollTop < 100;

        // Only disable auto-scroll if:
        // 1. User scrolls UP (not down)
        // 2. User is NOT near the bottom
        if (currentScrollTop < lastScrollTop - 5 && !isNearBottom) {
          // User scrolled up and away from bottom - disable auto-scroll
          setAutoScroll(false);
        }
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [setAutoScroll]);

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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface transition-theme overflow-hidden">
      {/* Scrollable container for both header and content */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto min-h-0"
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
          {displayRows.length === 0 ? (
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
                const displayRow = displayRows[virtualRow.index];
                return (
                  <div
                    key={`${displayRow.entry.id}-${virtualRow.index}`}
                    data-index={virtualRow.index}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: fixedRowHeight,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <LogRow
                      displayRow={displayRow}
                      settings={rowSettings}
                      columnWidths={columnWidths}
                      metaWidth={metaWidth}
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
