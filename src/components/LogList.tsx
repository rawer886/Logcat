import { useRef, useEffect, memo, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLogStore } from "../stores/logStore";
import { LOG_LEVEL_INFO, FONT_FAMILY_MAP, type LogEntry, type TimestampFormat, type FontFamily } from "../types";

// 显示行类型：主行或续行
interface DisplayRow {
  type: "main" | "continuation";
  entry: LogEntry;
  prevEntry: LogEntry | null;
  messageSlice: string; // 当前行显示的消息片段
}

// 固定列宽（字符数）- 用于对齐
const FIXED_COL_CHARS = {
  timestamp: 12,      // "HH:mm:ss.SSS"
  datetime: 23,       // "YYYY-MM-DD HH:mm:ss.SSS"
  pid: 5,             // "12345"
  pidTid: 11,         // "12345-12345"
  level: 1,           // "D"
};

// 中间省略截断函数：如果字符串超过 maxLen，在中间用 '...' 替代
// 例如：truncateMiddle("ControlCenterHeaderExpandController", 25) => "ControlCente...dController"
const truncateMiddle = (str: string, maxLen: number): string => {
  if (!str || str.length <= maxLen) return str;
  if (maxLen < 5) return str.substring(0, maxLen);

  const ellipsis = '...';
  const charsToShow = maxLen - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return str.substring(0, frontChars) + ellipsis + str.substring(str.length - backChars);
};

// Tag color count
const TAG_COLOR_COUNT = 15;

// Simple hash function for tag string
const hashTag = (tag: string): number => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    const char = tag.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % TAG_COLOR_COUNT;
};

// Get CSS variable for tag color
const getTagColor = (tag: string): string => {
  const colorIndex = hashTag(tag);
  return `var(--tag-color-${colorIndex})`;
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

// 右对齐填充
const padStart = (str: string, len: number): string => {
  if (str.length >= len) return str;
  return ' '.repeat(len - str.length) + str;
};

// 左对齐填充
const padEnd = (str: string, len: number): string => {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
};

// Settings type for LogRow
interface RowSettings {
  showTimestamp: boolean;
  timestampFormat: TimestampFormat;
  showPid: boolean;
  showTid: boolean;
  showPackageName: boolean;
  showProcessName: boolean;
  showRepeatedPackageName: boolean;
  showRepeatedProcessName: boolean;
  showLevel: boolean;
  showTag: boolean;
  showRepeatedTags: boolean;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  wrapLines: boolean;
  // Column widths (in characters)
  tagColumnWidth: number;
  packageColumnWidth: number;
  processColumnWidth: number;
}

// 自定义比较函数，优化 LogRow 的渲染判断
function arePropsEqual(
  prevProps: { displayRow: DisplayRow; settings: RowSettings },
  nextProps: { displayRow: DisplayRow; settings: RowSettings }
): boolean {
  // DisplayRow 比较
  if (prevProps.displayRow.type !== nextProps.displayRow.type) return false;
  if (prevProps.displayRow.entry.id !== nextProps.displayRow.entry.id) return false;
  if (prevProps.displayRow.messageSlice !== nextProps.displayRow.messageSlice) return false;
  if (prevProps.displayRow.prevEntry?.id !== nextProps.displayRow.prevEntry?.id) return false;

  // Settings 对象引用变化（已被 useMemo 优化，只需比较引用）
  if (prevProps.settings !== nextProps.settings) return false;

  return true;
}

// Memoized log row component - 使用单 div + span 结构
const LogRow = memo(function LogRow({
  displayRow,
  settings,
}: {
  displayRow: DisplayRow;
  settings: RowSettings;
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
  // 当 showRepeated 为 false 时，隐藏重复的值
  const isTagRepeated = type === "main" && !settings.showRepeatedTags && prevEntry && prevEntry.tag === entry.tag;
  const isPackageNameRepeated = type === "main" && !settings.showRepeatedPackageName && prevEntry && prevEntry.packageName === entry.packageName;
  const isProcessNameRepeated = type === "main" && !settings.showRepeatedProcessName && prevEntry && prevEntry.processName === entry.processName;

  // 计算元数据列的总字符宽度（用于续行的空白占位）
  const getMetaCharWidth = () => {
    let width = 0;
    if (settings.showTimestamp) {
      width += (settings.timestampFormat === "datetime" ? FIXED_COL_CHARS.datetime : FIXED_COL_CHARS.timestamp) + 1;
    }
    if (settings.showPid) {
      width += (settings.showTid ? FIXED_COL_CHARS.pidTid : FIXED_COL_CHARS.pid) + 1;
    }
    if (settings.showTag) width += settings.tagColumnWidth + 1;
    if (settings.showPackageName) width += settings.packageColumnWidth + 1;
    if (settings.showProcessName) width += settings.processColumnWidth + 1;
    if (settings.showLevel) width += FIXED_COL_CHARS.level + 1;
    return width;
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
    const metaWidth = getMetaCharWidth();
    return (
      <div
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: `${settings.lineHeight}`,
          fontFamily: FONT_FAMILY_MAP[settings.fontFamily],
        }}
        className="h-full whitespace-pre"
      >
        <span className="text-transparent select-none">{' '.repeat(metaWidth)}</span>
        <span data-col="message" style={{ color: levelInfo.color }}>{messageSlice}</span>
      </div>
    );
  }

  // 主行：构建完整的一行内容
  const timestampWidth = settings.timestampFormat === "datetime" ? FIXED_COL_CHARS.datetime : FIXED_COL_CHARS.timestamp;
  const pidWidth = settings.showTid ? FIXED_COL_CHARS.pidTid : FIXED_COL_CHARS.pid;

  return (
    <div
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: `${settings.lineHeight}`,
        fontFamily: FONT_FAMILY_MAP[settings.fontFamily],
      }}
      className="h-full whitespace-pre"
    >
      {/* Timestamp */}
      {settings.showTimestamp && (
        <>
          <span data-col="timestamp" className="text-text-muted">
            {padEnd(formatTimestamp(entry, settings.timestampFormat), timestampWidth)}
          </span>
          <span className="text-text-muted"> </span>
        </>
      )}

      {/* PID (with optional TID) */}
      {settings.showPid && (
        <>
          <span data-col="pid" className="text-text-muted">
            {padStart(formatPidTid(), pidWidth)}
          </span>
          <span className="text-text-muted"> </span>
        </>
      )}

      {/* Tag */}
      {settings.showTag && (
        <>
          <span
            data-col="tag"
            style={{ color: isTagRepeated ? 'transparent' : getTagColor(entry.tag) }}
            title={entry.tag}
          >
            {padEnd(isTagRepeated ? '' : truncateMiddle(entry.tag, settings.tagColumnWidth), settings.tagColumnWidth)}
          </span>
          <span className="text-text-muted"> </span>
        </>
      )}

      {/* Package Name */}
      {settings.showPackageName && (
        <>
          <span data-col="package" className="text-text-secondary" title={entry.packageName}>
            {padEnd(isPackageNameRepeated ? '' : truncateMiddle(entry.packageName || '-', settings.packageColumnWidth), settings.packageColumnWidth)}
          </span>
          <span className="text-text-muted"> </span>
        </>
      )}

      {/* Process Name */}
      {settings.showProcessName && (
        <>
          <span data-col="process" className="text-text-muted" title={entry.processName}>
            {padEnd(isProcessNameRepeated ? '' : truncateMiddle(entry.processName || '-', settings.processColumnWidth), settings.processColumnWidth)}
          </span>
          <span className="text-text-muted"> </span>
        </>
      )}

      {/* Level */}
      {settings.showLevel && (
        <>
          <span
            data-col="level"
            className="font-bold px-1 -my-[0.6em] py-[0.6em]"
            style={{ color: levelInfo.color, backgroundColor: levelInfo.bgColor }}
          >
            {entry.level}
          </span>
          <span className="text-text-muted"> </span>
        </>
      )}

      {/* Message */}
      <span data-col="message" style={{ color: levelInfo.color }}>
        {messageSlice}
      </span>
    </div>
  );
}, arePropsEqual);

export function LogList() {
  const { filteredLogs, autoScroll, settings, setAutoScroll } = useLogStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(0);
  const prevAutoScrollRef = useRef(autoScroll);
  const lastScrollTopRef = useRef(0);

  // 估算每行可显示的字符数（基于等宽字体）
  const charsPerLine = useMemo(() => {
    // 等宽字体：字符宽度约为 fontSize * 0.6
    const charWidth = settings.fontSize * 0.6;
    // 假设容器宽度为 1200px，减去一些 padding
    return Math.floor(1200 / charWidth);
  }, [settings.fontSize]);

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

  // 计算固定行高
  const fixedRowHeight = Math.max(22, Math.ceil(settings.fontSize * settings.lineHeight) + 4);

  // Virtual list configuration
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

      const currentAutoScroll = useLogStore.getState().autoScroll;

      if (currentAutoScroll) {
        const isNearBottom = scrollHeight - clientHeight - currentScrollTop < 100;

        if (currentScrollTop < lastScrollTop - 5 && !isNearBottom) {
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
      showRepeatedPackageName: settings.showRepeatedPackageName,
      showRepeatedProcessName: settings.showRepeatedProcessName,
      showLevel: settings.showLevel,
      showTag: settings.showTag,
      showRepeatedTags: settings.showRepeatedTags,
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      wrapLines: settings.wrapLines,
      tagColumnWidth: settings.tagColumnWidth,
      packageColumnWidth: settings.packageColumnWidth,
      processColumnWidth: settings.processColumnWidth,
    }),
    [
      settings.showTimestamp,
      settings.timestampFormat,
      settings.showPid,
      settings.showTid,
      settings.showPackageName,
      settings.showProcessName,
      settings.showRepeatedPackageName,
      settings.showRepeatedProcessName,
      settings.showLevel,
      settings.showTag,
      settings.showRepeatedTags,
      settings.fontFamily,
      settings.fontSize,
      settings.lineHeight,
      settings.wrapLines,
      settings.tagColumnWidth,
      settings.packageColumnWidth,
      settings.processColumnWidth,
    ]
  );

  // 构建表头元素（带分割线）
  const headerColumns = useMemo(() => {
    const columns: { label: string; width: number; align: 'left' | 'right' }[] = [];
    const timestampWidth = settings.timestampFormat === "datetime" ? FIXED_COL_CHARS.datetime : FIXED_COL_CHARS.timestamp;
    const pidWidth = settings.showTid ? FIXED_COL_CHARS.pidTid : FIXED_COL_CHARS.pid;

    if (settings.showTimestamp) {
      const label = settings.timestampFormat === "datetime" ? "DATE/TIME" :
        settings.timestampFormat === "epoch" ? "TIMESTAMP" : "TIME";
      columns.push({ label, width: timestampWidth, align: 'left' });
    }
    if (settings.showPid) {
      columns.push({ label: settings.showTid ? "PID-TID" : "PID", width: pidWidth, align: 'right' });
    }
    if (settings.showTag) {
      columns.push({ label: "TAG", width: settings.tagColumnWidth, align: 'left' });
    }
    if (settings.showPackageName) {
      columns.push({ label: "PACKAGE", width: settings.packageColumnWidth, align: 'left' });
    }
    if (settings.showProcessName) {
      columns.push({ label: "PROCESS", width: settings.processColumnWidth, align: 'left' });
    }
    if (settings.showLevel) {
      columns.push({ label: "L", width: 1, align: 'left' });
    }
    columns.push({ label: "MESSAGE", width: 0, align: 'left' });

    return columns;
  }, [settings.showTimestamp, settings.timestampFormat, settings.showPid, settings.showTid,
  settings.showTag, settings.showPackageName, settings.showProcessName, settings.showLevel,
  settings.tagColumnWidth, settings.packageColumnWidth, settings.processColumnWidth]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface transition-theme overflow-hidden">
      {/* Scrollable container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto min-h-0 log-list-container"
      >
        {/* Column Header - sticky */}
        <div
          className="font-semibold bg-surface-secondary border-b border-border sticky top-0 z-10 select-none px-2 py-1 text-text-secondary text-xs flex items-center"
          style={{
            fontFamily: FONT_FAMILY_MAP[settings.fontFamily],
          }}
        >
          {headerColumns.map((col, index) => {
            const isLast = index === headerColumns.length - 1;
            return (
              <span
                key={col.label}
                className={`shrink-0 ${isLast ? 'text-left' : 'text-center'} ${!isLast ? 'border-r border-border pr-1 mr-1' : ''}`}
                style={{
                  width: col.width > 0 ? `${col.width}ch` : 'auto',
                  flex: col.width === 0 ? 1 : 'none',
                }}
              >
                {col.label}
              </span>
            );
          })}
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
                  className="px-2 overflow-hidden"
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
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
