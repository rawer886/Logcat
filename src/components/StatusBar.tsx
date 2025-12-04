import React from "react";
import { Circle } from "lucide-react";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { LOG_LEVEL_INFO, type LogLevel } from "../types";

export function StatusBar() {
  const {
    stats,
    isPaused,
    isConnected,
  } = useLogStore();

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

        {/* Pause Status */}
        {isPaused && (
          <span className="text-log-warn font-medium">已暂停</span>
        )}

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
    </div>
  );
}
