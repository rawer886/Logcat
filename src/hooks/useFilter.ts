import { useCallback, useMemo } from "react";
import { useLogStore } from "../stores/logStore";
import type { LogLevel, FilterConfig } from "../types";
import { createSearchRegex } from "../lib/utils";

interface UseFilterReturn {
  filter: FilterConfig;
  searchRegex: RegExp | null;
  setSearchText: (text: string) => void;
  toggleLevel: (level: LogLevel) => void;
  setLevels: (levels: LogLevel[]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setTags: (tags: string[]) => void;
  setPackageName: (name: string | undefined) => void;
  setPid: (pid: number | undefined) => void;
  toggleRegex: () => void;
  toggleCaseSensitive: () => void;
  resetFilter: () => void;
}

export function useFilter(): UseFilterReturn {
  const { filter, setFilter, resetFilter } = useLogStore();

  // Memoized search regex
  const searchRegex = useMemo(
    () =>
      createSearchRegex(
        filter.searchText,
        filter.isRegex,
        filter.isCaseSensitive
      ),
    [filter.searchText, filter.isRegex, filter.isCaseSensitive]
  );

  // Set search text
  const setSearchText = useCallback(
    (text: string) => {
      setFilter({ searchText: text });
    },
    [setFilter]
  );

  // Toggle a single log level
  const toggleLevel = useCallback(
    (level: LogLevel) => {
      const newLevels = filter.levels.includes(level)
        ? filter.levels.filter((l) => l !== level)
        : [...filter.levels, level];
      setFilter({ levels: newLevels });
    },
    [filter.levels, setFilter]
  );

  // Set all levels at once
  const setLevels = useCallback(
    (levels: LogLevel[]) => {
      setFilter({ levels });
    },
    [setFilter]
  );

  // Add a tag filter
  const addTag = useCallback(
    (tag: string) => {
      if (!filter.tags.includes(tag)) {
        setFilter({ tags: [...filter.tags, tag] });
      }
    },
    [filter.tags, setFilter]
  );

  // Remove a tag filter
  const removeTag = useCallback(
    (tag: string) => {
      setFilter({ tags: filter.tags.filter((t) => t !== tag) });
    },
    [filter.tags, setFilter]
  );

  // Set all tags at once
  const setTags = useCallback(
    (tags: string[]) => {
      setFilter({ tags });
    },
    [setFilter]
  );

  // Set package name filter
  const setPackageName = useCallback(
    (name: string | undefined) => {
      setFilter({ packageName: name });
    },
    [setFilter]
  );

  // Set PID filter
  const setPid = useCallback(
    (pid: number | undefined) => {
      setFilter({ pid });
    },
    [setFilter]
  );

  // Toggle regex mode
  const toggleRegex = useCallback(() => {
    setFilter({ isRegex: !filter.isRegex });
  }, [filter.isRegex, setFilter]);

  // Toggle case sensitivity
  const toggleCaseSensitive = useCallback(() => {
    setFilter({ isCaseSensitive: !filter.isCaseSensitive });
  }, [filter.isCaseSensitive, setFilter]);

  return {
    filter,
    searchRegex,
    setSearchText,
    toggleLevel,
    setLevels,
    addTag,
    removeTag,
    setTags,
    setPackageName,
    setPid,
    toggleRegex,
    toggleCaseSensitive,
    resetFilter,
  };
}

