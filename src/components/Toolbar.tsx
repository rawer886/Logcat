import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  Smartphone,
  Sun,
  Moon,
  Settings,
  ChevronDown,
  X,
  Filter,
  Star,
  Trash2,
  FileText,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLogStore } from "../stores/logStore";
import { useLogStream } from "../hooks/useLogStream";
import { useFilter } from "../hooks/useFilter";
import { SettingsPanel } from "./SettingsPanel";
import type { Device, FilterHistoryItem } from "../types";

// Filter syntax suggestions
const FILTER_SUGGESTIONS = [
  { keyword: "tag", prefix: "tag:", description: "Log tag contains string" },
  { keyword: "tag", prefix: "tag=:", description: "Log tag is exactly string" },
  { keyword: "tag", prefix: "tag~:", description: "Log tag matches regex" },
  { keyword: "tag", prefix: "-tag:", description: "Log tag does not contain string" },
  { keyword: "message", prefix: "message:", description: "Log message contains string" },
  { keyword: "message", prefix: "message=:", description: "Log message is exactly string" },
  { keyword: "message", prefix: "message~:", description: "Log message matches regex" },
  { keyword: "message", prefix: "-message:", description: "Log message does not contain string" },
  { keyword: "package", prefix: "package:", description: "Package name contains string" },
  { keyword: "package", prefix: "package=:", description: "Package name is exactly string" },
  { keyword: "package", prefix: "package:mine", description: "Show only my app's logs" },
  { keyword: "level", prefix: "level:", description: "Minimum log level (V/D/I/W/E/A)" },
  { keyword: "age", prefix: "age:", description: "Logs within time (e.g. 5m, 1h, 2d)" },
  { keyword: "is", prefix: "is:crash", description: "Show crash logs" },
  { keyword: "is", prefix: "is:stacktrace", description: "Show stacktrace logs" },
];

// Tips to show at the bottom
const TIPS = [
  "Add - to a key to exclude logs with the value (such as, \"-tag:\")",
  "Add ~ to use regex (such as, \"tag~:\" and \"-tag~:\")",
  "Use | to combine conditions with OR logic",
  "Use space to combine conditions with AND logic",
  "Press Enter to save filter to history",
];

export function Toolbar() {
  const { 
    settings, 
    toggleTheme,
    filterHistory,
    addFilterHistory,
    toggleFilterFavorite,
    deleteFilterHistory,
    importedFileName,
  } = useLogStore();
  const {
    devices,
    selectedDevice,
    isConnected,
    startLogcat,
    stopLogcat,
    refreshDevices,
  } = useLogStream();
  const {
    filter,
    setSearchText,
    toggleCaseSensitive,
  } = useFilter();

  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleDeviceSelect = async (device: Device) => {
    setIsDeviceMenuOpen(false);
    if (isConnected) {
      await stopLogcat();
    }
    await startLogcat(device.id);
  };

  const toggleDeviceMenu = useCallback(() => {
    setIsDeviceMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        refreshDevices().catch((error) => {
          console.error("Failed to refresh devices:", error);
        });
      }
      return next;
    });
  }, [refreshDevices]);

  // Get current word being typed (last word after space or |)
  const getCurrentWord = useCallback((text: string) => {
    const parts = text.split(/[\s|]+/);
    return parts[parts.length - 1] || "";
  }, []);

  // Check if current word is a complete key (ends with :)
  const isCompleteKey = useCallback((word: string) => {
    return /^-?[a-z]+(=|~)?:$/i.test(word) || /^-?[a-z]+(=|~)?:.+$/i.test(word);
  }, []);

  // Get matching suggestions based on current input
  const autocompleteItems = useMemo(() => {
    const currentWord = getCurrentWord(filter.searchText);
    if (!currentWord) return { suggestions: [], history: [], showSuggestions: false };

    const lowerWord = currentWord.toLowerCase();
    const hasCompleteKey = isCompleteKey(currentWord);

    // If user has typed a complete key (like "tag:"), only show history
    const showSuggestions = !hasCompleteKey;

    // Filter syntax suggestions
    const suggestions = showSuggestions
      ? FILTER_SUGGESTIONS.filter(
          (s) =>
            s.keyword.startsWith(lowerWord) ||
            s.prefix.toLowerCase().startsWith(lowerWord)
        )
      : [];

    // Filter history items that match current input
    const history = filterHistory
      .filter((h) => h.query.toLowerCase().includes(lowerWord))
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return b.timestamp - a.timestamp;
      })
      .slice(0, 10);

    return { suggestions, history, showSuggestions };
  }, [filter.searchText, filterHistory, getCurrentWord, isCompleteKey]);

  const hasAutocompleteItems = autocompleteItems.suggestions.length > 0 || autocompleteItems.history.length > 0;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
      setIsAutocompleteOpen(true);
      setSelectedIndex(0);
    },
    [setSearchText]
  );

  const handleSearchFocus = useCallback(() => {
    if (filter.searchText) {
      setIsAutocompleteOpen(true);
    }
  }, [filter.searchText]);

  const handleSearchBlur = useCallback(() => {
    // Delay to allow click on autocomplete items
    setTimeout(() => setIsAutocompleteOpen(false), 200);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const totalItems = autocompleteItems.suggestions.length + autocompleteItems.history.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(totalItems, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
      } else if (e.key === "Tab" || (e.key === "Enter" && isAutocompleteOpen && hasAutocompleteItems)) {
        e.preventDefault();
        // Select current item
        if (selectedIndex < autocompleteItems.suggestions.length) {
          const suggestion = autocompleteItems.suggestions[selectedIndex];
          const currentText = filter.searchText;
          const currentWord = getCurrentWord(currentText);
          const newText = currentText.slice(0, -currentWord.length) + suggestion.prefix;
          setSearchText(newText);
        } else {
          const historyIndex = selectedIndex - autocompleteItems.suggestions.length;
          const historyItem = autocompleteItems.history[historyIndex];
          if (historyItem) {
            setSearchText(historyItem.query);
            setIsAutocompleteOpen(false);
          }
        }
      } else if (e.key === "Enter" && filter.searchText.trim()) {
        addFilterHistory(filter.searchText.trim());
        setIsAutocompleteOpen(false);
      } else if (e.key === "Escape") {
        setIsAutocompleteOpen(false);
      }
    },
    [filter.searchText, addFilterHistory, autocompleteItems, selectedIndex, getCurrentWord, setSearchText, isAutocompleteOpen, hasAutocompleteItems]
  );

  const handleSuggestionClick = useCallback(
    (prefix: string) => {
      const currentText = filter.searchText;
      const currentWord = getCurrentWord(currentText);
      const newText = currentText.slice(0, -currentWord.length) + prefix;
      setSearchText(newText);
      searchInputRef.current?.focus();
    },
    [filter.searchText, getCurrentWord, setSearchText]
  );

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setIsAutocompleteOpen(false);
  }, [setSearchText]);

  const handleHistorySelect = useCallback(
    (item: FilterHistoryItem) => {
      setSearchText(item.query);
      setIsHistoryOpen(false);
      setIsAutocompleteOpen(false);
      searchInputRef.current?.focus();
    },
    [setSearchText]
  );

  // Rotate tips
  const nextTip = useCallback(() => {
    setTipIndex((prev) => (prev + 1) % TIPS.length);
  }, []);

  // Sort history: favorites first, then by timestamp
  const sortedHistory = [...filterHistory].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.timestamp - a.timestamp;
  });

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-surface-secondary border-b border-border transition-theme">
      {/* Device/File Selector */}
      <div className="relative">
        <button
          onClick={toggleDeviceMenu}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
            "bg-surface hover:bg-surface-elevated border border-border",
            "transition-colors duration-150",
            "min-w-[180px] justify-between"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {importedFileName ? (
              // Show file icon when viewing imported file
              <FileText className="w-4 h-4 text-accent flex-shrink-0" />
            ) : (
              // Show device icon
              <Smartphone className={cn(
                "w-4 h-4 flex-shrink-0",
                isConnected ? "text-log-info" : "text-text-secondary"
              )} />
            )}
            <span className="text-text-primary truncate">
              {importedFileName || selectedDevice?.name || "选择设备"}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-text-muted transition-transform duration-200 flex-shrink-0",
              isDeviceMenuOpen && "transform rotate-180"
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isDeviceMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDeviceMenuOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-full min-w-[250px] bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1 animate-fade-in">
              {devices.length === 0 ? (
                <div className="px-3 py-2 text-sm text-text-muted">
                  未检测到设备
                </div>
              ) : (
                devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleDeviceSelect(device)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                      "hover:bg-accent/10 transition-colors",
                      selectedDevice?.id === device.id && "bg-accent/20"
                    )}
                  >
                    <Smartphone
                      className={cn(
                        "w-4 h-4",
                        device.state === "device"
                          ? "text-log-info"
                          : "text-text-muted"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-text-primary truncate">
                        {device.name}
                      </div>
                      <div className="text-2xs text-text-muted truncate">
                        {device.id}
                      </div>
                    </div>
                    {device.isEmulator && (
                      <span className="text-2xs px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                        模拟器
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Search Input with History */}
      <div className="relative flex-1 flex items-center">
        {/* Filter Button */}
        <div className="relative">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={cn(
              "flex items-center justify-center w-8 h-8 border border-r-0 border-border rounded-l-md",
              "bg-surface hover:bg-surface-elevated transition-colors",
              isHistoryOpen && "bg-surface-elevated"
            )}
            title="过滤历史"
          >
            <Filter className="w-4 h-4 text-text-muted" />
          </button>

          {/* History Dropdown */}
          {isHistoryOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsHistoryOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-[400px] max-h-[400px] overflow-y-auto bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1 animate-fade-in">
                {sortedHistory.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-text-muted text-center">
                    暂无过滤历史
                  </div>
                ) : (
                  <>
                    {sortedHistory.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2 px-2 py-1.5 hover:bg-accent/10 transition-colors"
                      >
                        {/* Favorite Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFilterFavorite(item.id);
                          }}
                          className={cn(
                            "p-1 rounded transition-colors",
                            item.isFavorite
                              ? "text-yellow-500 hover:text-yellow-600"
                              : "text-text-muted hover:text-yellow-500 opacity-0 group-hover:opacity-100"
                          )}
                          title={item.isFavorite ? "取消收藏" : "收藏"}
                        >
                          <Star
                            className="w-4 h-4"
                            fill={item.isFavorite ? "currentColor" : "none"}
                          />
                        </button>

                        {/* Query Text */}
                        <button
                          onClick={() => handleHistorySelect(item)}
                          className="flex-1 text-left text-sm text-text-primary truncate hover:text-accent"
                        >
                          {item.query}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFilterHistory(item.id);
                          }}
                          className="p-1 rounded text-text-muted hover:text-log-error opacity-0 group-hover:opacity-100 transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={filter.searchText}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="Press ^Space to see suggestions"
            className={cn(
              "w-full px-3 py-1.5 rounded-none text-sm",
              "bg-surface border-y border-border",
              "text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
              "transition-colors duration-150"
            )}
          />

          {/* Clear Search */}
          {filter.searchText && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-elevated transition-colors"
              title="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {isAutocompleteOpen && hasAutocompleteItems && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-elevated border border-border rounded-md shadow-lg z-30 overflow-hidden animate-fade-in">
              <div className="max-h-[350px] overflow-y-auto">
                {/* Syntax Suggestions */}
                {autocompleteItems.suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.prefix}
                    onClick={() => handleSuggestionClick(suggestion.prefix)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm",
                      "hover:bg-accent/10 transition-colors",
                      selectedIndex === index && "bg-accent/10"
                    )}
                  >
                    <span className="font-mono">
                      <span className="text-accent">{suggestion.prefix.split(":")[0]}</span>
                      <span className="text-text-primary">:{suggestion.prefix.split(":")[1] || ""}</span>
                    </span>
                    <span className="text-text-muted text-xs ml-4">
                      {suggestion.description}
                    </span>
                  </button>
                ))}

                {/* Divider */}
                {autocompleteItems.suggestions.length > 0 && autocompleteItems.history.length > 0 && (
                  <div className="border-t border-border my-1" />
                )}

                {/* History Items */}
                {autocompleteItems.history.map((item, index) => {
                  const actualIndex = autocompleteItems.suggestions.length + index;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleHistorySelect(item)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm",
                        "hover:bg-accent/10 transition-colors",
                        selectedIndex === actualIndex && "bg-accent/10"
                      )}
                    >
                      <Star
                        className={cn(
                          "w-4 h-4 flex-shrink-0",
                          item.isFavorite ? "text-yellow-500" : "text-text-muted"
                        )}
                        fill={item.isFavorite ? "currentColor" : "none"}
                      />
                      <span className="text-text-primary truncate flex-1 text-left">
                        {item.query}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tips Footer */}
              <div
                className="border-t border-border px-3 py-2 text-xs text-text-muted flex items-center justify-between bg-surface-secondary cursor-pointer hover:bg-surface"
                onClick={nextTip}
              >
                <span>{TIPS[tipIndex]}</span>
                <span className="text-accent hover:underline">Next Tip</span>
              </div>
            </div>
          )}
        </div>

        {/* Match Case Button */}
        <button
          onClick={toggleCaseSensitive}
          className={cn(
            "flex items-center justify-center px-2 h-8 border border-l-0 border-border rounded-r-md",
            "text-sm font-medium transition-colors",
            filter.isCaseSensitive
              ? "bg-accent text-white"
              : "bg-surface text-text-muted hover:bg-surface-elevated hover:text-text-secondary"
          )}
          title="区分大小写 (Match Case)"
        >
          Cc
        </button>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={cn(
          "p-2 rounded-md hover:bg-surface-elevated transition-colors",
          "text-text-secondary hover:text-text-primary"
        )}
        title={settings.theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
      >
        {settings.theme === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>

      {/* Settings */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className={cn(
          "p-2 rounded-md hover:bg-surface-elevated transition-colors",
          "text-text-secondary hover:text-text-primary"
        )}
        title="设置"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
