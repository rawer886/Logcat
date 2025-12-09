import type { LogEntry, FilterConfig } from "../types";

// ============================================
// Filter Worker - 在后台线程执行过滤操作
// ============================================

interface WorkerMessage {
  type: "filter";
  logs: LogEntry[];
  filter: FilterConfig;
  requestId: string;
}

interface WorkerResponse {
  type: "filter-result";
  filteredLogs: LogEntry[];
  requestId: string;
}

// 缓存编译后的正则表达式
const regexCache = new Map<string, RegExp>();

function getCachedRegex(pattern: string, caseSensitive: boolean): RegExp | null {
  const cacheKey = `${pattern}:${caseSensitive}`;

  if (regexCache.has(cacheKey)) {
    return regexCache.get(cacheKey)!;
  }

  try {
    const regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
    regexCache.set(cacheKey, regex);
    return regex;
  } catch {
    return null;
  }
}

// Query parsing types
interface FilterCondition {
  value: string;
  mode: "contains" | "exact" | "regex";
  exclude: boolean;
}

interface OrGroup {
  conditions: FilterCondition[];
}

interface ParsedQuery {
  text: string;
  tagGroups: OrGroup[];
  packageGroups: OrGroup[];
  messageGroups: OrGroup[];
  minLevel?: string;
  age?: { value: number; unit: string };
  isCrash: boolean;
  isStacktrace: boolean;
}

// 解析 Android Studio 风格的查询语法
function parseLogcatQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    text: "",
    tagGroups: [],
    packageGroups: [],
    messageGroups: [],
    isCrash: false,
    isStacktrace: false,
  };

  if (!query.trim()) {
    return result;
  }

  // Split by | for OR groups, but respect quotes
  const orParts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "|" && !inQuotes) {
      if (current.trim()) {
        orParts.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    orParts.push(current.trim());
  }

  // If we have OR parts, process each as an OR group
  if (orParts.length > 1) {
    const tagOrConditions: FilterCondition[] = [];
    const packageOrConditions: FilterCondition[] = [];
    const messageOrConditions: FilterCondition[] = [];

    for (const part of orParts) {
      const tokens = tokenize(part);
      for (const token of tokens) {
        const parsed = parseKeyValue(token);
        if (parsed) {
          const condition: FilterCondition = {
            value: parsed.value,
            mode: parsed.mode,
            exclude: parsed.exclude
          };

          switch (parsed.key) {
            case "tag":
              tagOrConditions.push(condition);
              break;
            case "package":
              packageOrConditions.push(condition);
              break;
            case "message":
              messageOrConditions.push(condition);
              break;
          }
          processOtherKeys(parsed, result);
        } else if (!token.startsWith("-")) {
          result.text = (result.text + " " + token).trim();
        }
      }
    }

    if (tagOrConditions.length > 0) {
      result.tagGroups.push({ conditions: tagOrConditions });
    }
    if (packageOrConditions.length > 0) {
      result.packageGroups.push({ conditions: packageOrConditions });
    }
    if (messageOrConditions.length > 0) {
      result.messageGroups.push({ conditions: messageOrConditions });
    }
  } else {
    // No OR, process as AND (each condition is its own group)
    const tokens = tokenize(query);

    for (const token of tokens) {
      const parsed = parseKeyValue(token);
      if (parsed) {
        const condition: FilterCondition = {
          value: parsed.value,
          mode: parsed.mode,
          exclude: parsed.exclude
        };

        switch (parsed.key) {
          case "tag":
            result.tagGroups.push({ conditions: [condition] });
            break;
          case "package":
            result.packageGroups.push({ conditions: [condition] });
            break;
          case "message":
            result.messageGroups.push({ conditions: [condition] });
            break;
        }
        processOtherKeys(parsed, result);
      } else if (!token.startsWith("-")) {
        result.text = (result.text + " " + token).trim();
      }
    }
  }

  return result;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === " " && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  return tokens;
}

function parseKeyValue(token: string): { key: string; value: string; mode: "contains" | "exact" | "regex"; exclude: boolean } | null {
  const exclude = token.startsWith("-");
  const cleanToken = exclude ? token.slice(1) : token;

  let mode: "contains" | "exact" | "regex" = "contains";
  let separator = ":";

  if (cleanToken.includes("=:")) {
    mode = "exact";
    separator = "=:";
  } else if (cleanToken.includes("~:")) {
    mode = "regex";
    separator = "~:";
  } else if (!cleanToken.includes(":")) {
    return null;
  }

  const parts = cleanToken.split(separator);
  if (parts.length < 2) return null;

  const key = parts[0].toLowerCase();
  const value = parts.slice(1).join(separator).replace(/^["']|["']$/g, "");

  return { key, value, mode, exclude };
}

function processOtherKeys(parsed: { key: string; value: string; mode: "contains" | "exact" | "regex"; exclude: boolean }, result: ParsedQuery) {
  switch (parsed.key) {
    case "level":
      const levelValue = parsed.value.toUpperCase();
      if (["VERBOSE", "DEBUG", "INFO", "WARN", "ERROR", "ASSERT", "V", "D", "I", "W", "E", "A"].includes(levelValue)) {
        result.minLevel = levelValue;
      }
      break;
    case "age":
      const match = parsed.value.match(/^(\d+)([smhd])$/i);
      if (match) {
        result.age = {
          value: parseInt(match[1], 10),
          unit: match[2].toLowerCase(),
        };
      }
      break;
    case "is":
      const isValue = parsed.value.toLowerCase();
      if (isValue === "crash") {
        result.isCrash = true;
      } else if (isValue === "stacktrace") {
        result.isStacktrace = true;
      }
      break;
  }
}

function matchCondition(value: string, condition: FilterCondition): boolean {
  const v = value.toLowerCase();
  const c = condition.value.toLowerCase();

  let matches = false;

  switch (condition.mode) {
    case "exact":
      matches = v === c;
      break;
    case "regex":
      const regex = getCachedRegex(condition.value, false);
      if (regex) {
        matches = regex.test(value);
      }
      break;
    case "contains":
    default:
      matches = v.includes(c);
      break;
  }

  return condition.exclude ? !matches : matches;
}

function matchOrGroup(value: string, group: OrGroup): boolean {
  if (group.conditions.length === 0) return true;

  const includes = group.conditions.filter(c => !c.exclude);
  const excludes = group.conditions.filter(c => c.exclude);

  for (const cond of excludes) {
    if (!matchCondition(value, cond)) {
      return false;
    }
  }

  if (includes.length > 0) {
    return includes.some(cond => matchCondition(value, cond));
  }

  return true;
}

function matchesQuery(entry: LogEntry, query: ParsedQuery, isCaseSensitive: boolean = false): boolean {
  // Level filter
  if (query.minLevel) {
    const levelOrder = ["V", "VERBOSE", "D", "DEBUG", "I", "INFO", "W", "WARN", "E", "ERROR", "A", "ASSERT"];
    const entryLevelIndex = levelOrder.indexOf(entry.level);
    const queryLevelIndex = levelOrder.indexOf(query.minLevel);

    const normalizedEntry = Math.floor(entryLevelIndex / 2) * 2;
    const normalizedQuery = Math.floor(queryLevelIndex / 2) * 2;

    if (normalizedEntry < normalizedQuery) {
      return false;
    }
  }

  // Tag filter
  for (const group of query.tagGroups) {
    if (!matchOrGroup(entry.tag, group)) {
      return false;
    }
  }

  // Package filter
  const packageName = entry.packageName || "";
  for (const group of query.packageGroups) {
    const hasSpecialMine = group.conditions.some(c => c.value.toLowerCase() === "mine" && !c.exclude);
    if (hasSpecialMine) {
      continue;
    }
    if (!matchOrGroup(packageName, group)) {
      return false;
    }
  }

  // Message filter
  for (const group of query.messageGroups) {
    if (!matchOrGroup(entry.message, group)) {
      return false;
    }
  }

  // Age filter
  if (query.age && entry.epoch) {
    const now = Date.now();
    let maxAge = 0;
    switch (query.age.unit) {
      case "s": maxAge = query.age.value * 1000; break;
      case "m": maxAge = query.age.value * 60 * 1000; break;
      case "h": maxAge = query.age.value * 60 * 60 * 1000; break;
      case "d": maxAge = query.age.value * 24 * 60 * 60 * 1000; break;
    }
    if (now - entry.epoch > maxAge) {
      return false;
    }
  }

  // Crash filter
  if (query.isCrash) {
    const isCrashLog =
      entry.message.includes("FATAL EXCEPTION") ||
      entry.message.includes("AndroidRuntime") ||
      entry.tag === "AndroidRuntime" ||
      entry.message.includes("native crash") ||
      entry.message.includes("SIGSEGV") ||
      entry.message.includes("SIGABRT");
    if (!isCrashLog) {
      return false;
    }
  }

  // Stacktrace filter
  if (query.isStacktrace) {
    const isStacktrace =
      entry.message.includes("\tat ") ||
      entry.message.includes("at java.") ||
      entry.message.includes("at android.") ||
      entry.message.includes("at kotlin.") ||
      entry.message.match(/^\s+at\s+[\w.$]+\([\w.]+:\d+\)/);
    if (!isStacktrace) {
      return false;
    }
  }

  // Text search
  if (query.text) {
    const searchTarget = `${entry.tag} ${entry.message}`;
    const searchText = query.text;

    // 根据 isCaseSensitive 决定是否区分大小写
    if (isCaseSensitive) {
      if (!searchTarget.includes(searchText)) {
        return false;
      }
    } else {
      if (!searchTarget.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

// 执行过滤操作
function filterLogs(logs: LogEntry[], filter: FilterConfig): LogEntry[] {
  const parsedQuery = parseLogcatQuery(filter.searchText);

  // 创建缓存的正则表达式（如果使用正则模式）
  const regex = filter.isRegex && parsedQuery.text
    ? getCachedRegex(parsedQuery.text, filter.isCaseSensitive)
    : null;

  return logs.filter((log) => {
    // 使用解析后的查询匹配
    if (!matchesQuery(log, parsedQuery, filter.isCaseSensitive)) {
      return false;
    }

    // 额外的正则匹配
    if (regex) {
      const searchTarget = `${log.tag} ${log.message}`;
      if (!regex.test(searchTarget)) {
        return false;
      }
    }

    // PID 过滤
    if (filter.pid !== undefined && log.pid !== filter.pid) {
      return false;
    }

    return true;
  });
}

// 监听主线程消息
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, logs, filter, requestId } = e.data;

  if (type === "filter") {
    const filteredLogs = filterLogs(logs, filter);

    const response: WorkerResponse = {
      type: "filter-result",
      filteredLogs,
      requestId,
    };

    self.postMessage(response);
  }
};
