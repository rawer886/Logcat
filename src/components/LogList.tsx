import React, { useRef, useEffect, useCallback, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn, highlightMatches, createSearchRegex } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { LOG_LEVEL_INFO, type LogEntry, type LogLevel } from "../types";

// Memoized log row component
const LogRow = memo(function LogRow({
  entry,
  searchRegex,
  style,
  settings,
}: {
  entry: LogEntry;
  searchRegex: RegExp | null;
  style: React.CSSProperties;
  settings: {
    showTimestamp: boolean;
    showPid: boolean;
    showTid: boolean;
    fontSize: number;
  };
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
      }}
      className={cn(
        "flex items-start font-mono border-b border-border/50 hover:bg-surface-elevated/50 transition-colors",
        getRowClassName(entry.level)
      )}
    >
      {/* Timestamp */}
      {settings.showTimestamp && (
        <div className="flex-shrink-0 w-[100px] px-2 py-1 text-text-muted truncate">
          {entry.timestamp}
        </div>
      )}

      {/* PID */}
      {settings.showPid && (
        <div className="flex-shrink-0 w-[60px] px-2 py-1 text-text-muted text-right">
          {entry.pid}
        </div>
      )}

      {/* TID */}
      {settings.showTid && (
        <div className="flex-shrink-0 w-[60px] px-2 py-1 text-text-muted text-right">
          {entry.tid}
        </div>
      )}

      {/* Level */}
      <div
        className="flex-shrink-0 w-[40px] px-2 py-1 text-center font-bold"
        style={{ color: levelInfo.color }}
      >
        {entry.level}
      </div>

      {/* Tag */}
      <div
        className="flex-shrink-0 w-[150px] px-2 py-1 truncate"
        style={{ color: levelInfo.color }}
        title={entry.tag}
      >
        {entry.tag}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0 px-2 py-1 text-text-primary whitespace-pre-wrap break-all">
        {searchRegex ? renderHighlightedText(entry.message) : entry.message}
      </div>
    </div>
  );
});

export function LogList() {
  const { filteredLogs, autoScroll, settings, filter } = useLogStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(0);

  // Create search regex for highlighting
  const searchRegex = createSearchRegex(
    filter.searchText,
    filter.isRegex,
    filter.isCaseSensitive
  );

  // Virtual list configuration
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // Estimated row height
    overscan: 20, // Number of items to render outside of the visible area
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
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface transition-theme">
      {/* Column Headers */}
      <div
        className="flex items-center font-mono text-xs font-semibold bg-surface-secondary border-b border-border sticky top-0 z-10"
        style={{ fontSize: `${settings.fontSize}px` }}
      >
        {settings.showTimestamp && (
          <div className="flex-shrink-0 w-[100px] px-2 py-2 text-text-secondary">
            时间
          </div>
        )}
        {settings.showPid && (
          <div className="flex-shrink-0 w-[60px] px-2 py-2 text-text-secondary text-right">
            PID
          </div>
        )}
        {settings.showTid && (
          <div className="flex-shrink-0 w-[60px] px-2 py-2 text-text-secondary text-right">
            TID
          </div>
        )}
        <div className="flex-shrink-0 w-[40px] px-2 py-2 text-text-secondary text-center">
          级别
        </div>
        <div className="flex-shrink-0 w-[150px] px-2 py-2 text-text-secondary">
          TAG
        </div>
        <div className="flex-1 px-2 py-2 text-text-secondary">消息</div>
      </div>

      {/* Virtual List */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted">
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
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = filteredLogs[virtualRow.index];
              return (
                <LogRow
                  key={entry.id}
                  entry={entry}
                  searchRegex={searchRegex}
                  settings={rowSettings}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

