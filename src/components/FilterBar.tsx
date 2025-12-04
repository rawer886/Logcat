import React, { useState, useCallback } from "react";
import {
  Search,
  X,
  CaseSensitive,
  Regex,
  Save,
  ChevronDown,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useFilter } from "../hooks/useFilter";
import { useLogStore } from "../stores/logStore";
import { LOG_LEVEL_INFO, type LogLevel } from "../types";

const LOG_LEVELS: LogLevel[] = ["V", "D", "I", "W", "E", "A"];

export function FilterBar() {
  const {
    filter,
    setSearchText,
    toggleLevel,
    toggleRegex,
    toggleCaseSensitive,
    resetFilter,
  } = useFilter();

  const { saveFilterPreset, filterPresets, loadFilterPreset } = useLogStore();

  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
    },
    [setSearchText]
  );

  const handleClearSearch = useCallback(() => {
    setSearchText("");
  }, [setSearchText]);

  const handleSavePreset = useCallback(() => {
    if (presetName.trim()) {
      saveFilterPreset(presetName.trim());
      setPresetName("");
      setShowSaveInput(false);
    }
  }, [presetName, saveFilterPreset]);

  const selectedLevelCount = filter.levels.length;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-surface border-b border-border transition-theme">
      {/* Search Input */}
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={filter.searchText}
          onChange={handleSearchChange}
          placeholder="搜索日志..."
          className={cn(
            "w-full pl-9 pr-24 py-2 rounded-md text-sm",
            "bg-surface-secondary border border-border",
            "text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
            "transition-colors duration-150"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Case Sensitive Toggle */}
          <button
            onClick={toggleCaseSensitive}
            className={cn(
              "p-1.5 rounded transition-colors",
              filter.isCaseSensitive
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-elevated"
            )}
            title="区分大小写"
          >
            <CaseSensitive className="w-4 h-4" />
          </button>

          {/* Regex Toggle */}
          <button
            onClick={toggleRegex}
            className={cn(
              "p-1.5 rounded transition-colors",
              filter.isRegex
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-elevated"
            )}
            title="正则表达式"
          >
            <Regex className="w-4 h-4" />
          </button>

          {/* Clear Search */}
          {filter.searchText && (
            <button
              onClick={handleClearSearch}
              className="p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-surface-elevated transition-colors"
              title="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Log Level Filter */}
      <div className="relative">
        <button
          onClick={() => setIsLevelMenuOpen(!isLevelMenuOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
            "bg-surface-secondary border border-border",
            "hover:bg-surface-elevated transition-colors"
          )}
        >
          <div className="flex items-center gap-0.5">
            {LOG_LEVELS.map((level) => (
              <span
                key={level}
                className={cn(
                  "w-5 h-5 text-xs font-bold flex items-center justify-center rounded",
                  filter.levels.includes(level)
                    ? "opacity-100"
                    : "opacity-30"
                )}
                style={{ color: LOG_LEVEL_INFO[level].color }}
              >
                {level}
              </span>
            ))}
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-text-muted transition-transform",
              isLevelMenuOpen && "rotate-180"
            )}
          />
        </button>

        {isLevelMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsLevelMenuOpen(false)}
            />
            <div className="absolute top-full right-0 mt-1 bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1 animate-fade-in min-w-[160px]">
              {LOG_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm",
                    "hover:bg-accent/10 transition-colors"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center",
                      filter.levels.includes(level)
                        ? "border-accent bg-accent"
                        : "border-border"
                    )}
                  >
                    {filter.levels.includes(level) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className="font-bold"
                    style={{ color: LOG_LEVEL_INFO[level].color }}
                  >
                    {level}
                  </span>
                  <span className="text-text-secondary">
                    {LOG_LEVEL_INFO[level].label}
                  </span>
                </button>
              ))}
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  if (selectedLevelCount === LOG_LEVELS.length) {
                    // Deselect all
                    LOG_LEVELS.forEach((l) => {
                      if (filter.levels.includes(l)) toggleLevel(l);
                    });
                  } else {
                    // Select all
                    LOG_LEVELS.forEach((l) => {
                      if (!filter.levels.includes(l)) toggleLevel(l);
                    });
                  }
                }}
                className="w-full px-3 py-2 text-sm text-text-secondary hover:bg-accent/10 transition-colors"
              >
                {selectedLevelCount === LOG_LEVELS.length
                  ? "取消全选"
                  : "全选"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Filter Presets */}
      <div className="relative">
        <button
          onClick={() => setIsPresetMenuOpen(!isPresetMenuOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
            "bg-surface-secondary border border-border",
            "hover:bg-surface-elevated transition-colors"
          )}
        >
          <Save className="w-4 h-4 text-text-secondary" />
          <span className="text-text-primary">过滤器</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-text-muted transition-transform",
              isPresetMenuOpen && "rotate-180"
            )}
          />
        </button>

        {isPresetMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setIsPresetMenuOpen(false);
                setShowSaveInput(false);
              }}
            />
            <div className="absolute top-full right-0 mt-1 bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1 animate-fade-in min-w-[200px]">
              {showSaveInput ? (
                <div className="p-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="过滤器名称"
                    className={cn(
                      "w-full px-2 py-1.5 rounded text-sm",
                      "bg-surface border border-border",
                      "text-text-primary placeholder:text-text-muted",
                      "focus:outline-none focus:border-accent"
                    )}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePreset();
                      if (e.key === "Escape") setShowSaveInput(false);
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSavePreset}
                      className="flex-1 px-2 py-1 text-sm bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setShowSaveInput(false)}
                      className="flex-1 px-2 py-1 text-sm bg-surface-secondary text-text-primary rounded hover:bg-surface transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowSaveInput(true)}
                    className="w-full px-3 py-2 text-sm text-left text-text-primary hover:bg-accent/10 transition-colors"
                  >
                    保存当前过滤器
                  </button>
                  <button
                    onClick={() => {
                      resetFilter();
                      setIsPresetMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left text-text-secondary hover:bg-accent/10 transition-colors"
                  >
                    重置过滤器
                  </button>
                  {filterPresets.length > 0 && (
                    <>
                      <div className="border-t border-border my-1" />
                      {filterPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            loadFilterPreset(preset.id);
                            setIsPresetMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-sm text-left text-text-primary hover:bg-accent/10 transition-colors"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

