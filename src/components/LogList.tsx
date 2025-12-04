import React, { useRef, useEffect, useCallback, memo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn, highlightMatches, createSearchRegex } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { LOG_LEVEL_INFO, type LogEntry, type LogLevel } from "../types";

// Column width state
interface ColumnWidths {
  timestamp: number;
  pid: number;
  tid: number;
  level: number;
  tag: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  timestamp: 100,
  pid: 60,
  tid: 60,
  level: 40,
  tag: 150,
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

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + delta);
      onResize(newWidth - width);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, width, onResize, minWidth]);

  return (
    <div className="relative flex-shrink-0 border-r border-border" style={{ width }}>
      {children}
      {/* Visible resize handle */}
      <div
        className={cn(
          "absolute right-0 top-1 bottom-1 w-[3px] cursor-col-resize rounded transition-all",
          "translate-x-1/2",
          isResizing 
            ? "bg-accent w-[4px]" 
            : isHovering 
              ? "bg-accent/70" 
              : "bg-border-strong/50 hover:bg-accent/70"
        )}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        title="拖动调整列宽"
      />
    </div>
  );
};

// Memoized log row component
const LogRow = memo(function LogRow({
  entry,
  searchRegex,
  style,
  settings,
  columnWidths,
}: {
  entry: LogEntry;
  searchRegex: RegExp | null;
  style: React.CSSProperties;
  settings: {
    showTimestamp: boolean;
    showPid: boolean;
    showTid: boolean;
    fontSize: number;
    lineHeight: number;
    wrapLines: boolean;
  };
  columnWidths: ColumnWidths;
}) {
  const levelInfo = LOG_LEVEL_INFO[entry.level];

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

  // Highlight search matches in message
  const renderHighlightedText = (text: string) => {
    const parts = highlightMatches(text, searchRegex);
    return parts.map((part, index) =>
      part.isMatch ? (
        <mark key={index} className="highlight-match">
          {part.text}
        </mark>
      ) : (
        <span key={index}>{part.text}</span>
      )
    );
  };

  return (
    <div
      style={{
        ...style,
        fontSize: `${settings.fontSize}px`,
        lineHeight: `${settings.lineHeight}`,
      }}
      className={cn(
        "flex items-start font-mono hover:bg-surface-elevated/50 transition-colors",
        getRowClassName(entry.level)
      )}
    >
      {/* Timestamp */}
      {settings.showTimestamp && (
        <div 
          className="flex-shrink-0 px-2 py-1 text-text-muted truncate"
          style={{ width: columnWidths.timestamp }}
        >
          {entry.timestamp}
        </div>
      )}

      {/* PID */}
      {settings.showPid && (
        <div 
          className="flex-shrink-0 px-2 py-1 text-text-muted text-right"
          style={{ width: columnWidths.pid }}
        >
          {entry.pid}
        </div>
      )}

      {/* TID */}
      {settings.showTid && (
        <div 
          className="flex-shrink-0 px-2 py-1 text-text-muted text-right"
          style={{ width: columnWidths.tid }}
        >
          {entry.tid}
        </div>
      )}

      {/* Level */}
      <div
        className="flex-shrink-0 px-2 py-1 text-center font-bold"
        style={{ color: levelInfo.color, width: columnWidths.level }}
      >
        {entry.level}
      </div>

      {/* Tag */}
      <div
        className="flex-shrink-0 px-2 py-1 truncate"
        style={{ color: levelInfo.color, width: columnWidths.tag }}
        title={entry.tag}
      >
        {entry.tag}
      </div>

      {/* Message */}
      <div 
        className={cn(
          "flex-1 min-w-[200px] px-2 py-1 text-text-primary",
          settings.wrapLines 
            ? "whitespace-pre-wrap break-all" 
            : "whitespace-pre"
        )}
        style={{ lineHeight: `${settings.lineHeight}` }}
      >
        {searchRegex ? renderHighlightedText(entry.message) : entry.message}
      </div>
    </div>
  );
});

export function LogList() {
  const { filteredLogs, autoScroll, settings, filter } = useLogStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(0);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_WIDTHS);

  const handleColumnResize = (column: keyof ColumnWidths, delta: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [column]: prev[column] + delta,
    }));
  };

  // Create search regex for highlighting
  const searchRegex = createSearchRegex(
    filter.searchText,
    filter.isRegex,
    filter.isCaseSensitive
  );

  // Virtual list configuration with dynamic height support
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => settings.wrapLines ? 60 : 28, // Larger estimate when wrapping
    overscan: 20, // Number of items to render outside of the visible area
    measureElement: (element) => {
      // Measure actual element height for dynamic sizing
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

  // Handle scroll to detect manual scrolling
  const handleScroll = useCallback(() => {
    if (!parentRef.current || !autoScroll) return;

    // Could implement auto-scroll pause here when user scrolls up
    // const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    // const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
  }, [autoScroll]);

  const rowSettings = {
    showTimestamp: settings.showTimestamp,
    showPid: settings.showPid,
    showTid: settings.showTid,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    wrapLines: settings.wrapLines,
  };

  // Calculate minimum content width based on column widths
  const minContentWidth = 
    (settings.showTimestamp ? columnWidths.timestamp : 0) +
    (settings.showPid ? columnWidths.pid : 0) +
    (settings.showTid ? columnWidths.tid : 0) +
    columnWidths.level +
    columnWidths.tag +
    500; // minimum message width

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface transition-theme overflow-hidden">
      {/* Scrollable container for both header and content */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto"
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
                minWidth={60}
              >
                <div className="px-2 py-2 text-text-secondary">时间</div>
              </ResizableHeader>
            )}
            {settings.showPid && (
              <ResizableHeader
                width={columnWidths.pid}
                onResize={(delta) => handleColumnResize("pid", delta)}
                minWidth={40}
              >
                <div className="px-2 py-2 text-text-secondary text-right">PID</div>
              </ResizableHeader>
            )}
            {settings.showTid && (
              <ResizableHeader
                width={columnWidths.tid}
                onResize={(delta) => handleColumnResize("tid", delta)}
                minWidth={40}
              >
                <div className="px-2 py-2 text-text-secondary text-right">TID</div>
              </ResizableHeader>
            )}
            <ResizableHeader
              width={columnWidths.level}
              onResize={(delta) => handleColumnResize("level", delta)}
              minWidth={30}
            >
              <div className="px-2 py-2 text-text-secondary text-center">级别</div>
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.tag}
              onResize={(delta) => handleColumnResize("tag", delta)}
              minWidth={60}
            >
              <div className="px-2 py-2 text-text-secondary">TAG</div>
            </ResizableHeader>
            <div className="flex-1 min-w-[200px] px-2 py-2 text-text-secondary">消息</div>
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
                      searchRegex={searchRegex}
                      settings={rowSettings}
                      columnWidths={columnWidths}
                      style={{}}
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

