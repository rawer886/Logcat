import { useEffect, useRef, useCallback } from "react";
import type { LogEntry, FilterConfig } from "../types";

interface WorkerResponse {
  type: "filter-result";
  filteredLogs: LogEntry[];
  requestId: string;
}

export function useFilterWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestsRef = useRef<Map<string, (filteredLogs: LogEntry[]) => void>>(new Map());
  const requestIdCounter = useRef(0);

  // 初始化 Worker
  useEffect(() => {
    // 创建 Worker
    const worker = new Worker(
      new URL("../workers/filter.worker.ts", import.meta.url),
      { type: "module" }
    );

    // 监听 Worker 消息
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { requestId, filteredLogs } = e.data;
      const resolve = pendingRequestsRef.current.get(requestId);

      if (resolve) {
        resolve(filteredLogs);
        pendingRequestsRef.current.delete(requestId);
      }
    };

    worker.onerror = (error) => {
      console.error("Filter worker error:", error);
    };

    workerRef.current = worker;

    // 清理
    return () => {
      worker.terminate();
      pendingRequestsRef.current.clear();
    };
  }, []);

  // 执行过滤
  const filterLogs = useCallback((logs: LogEntry[], filter: FilterConfig): Promise<LogEntry[]> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        // Worker 未就绪，返回空数组
        resolve([]);
        return;
      }

      const requestId = `filter-${++requestIdCounter.current}`;
      pendingRequestsRef.current.set(requestId, resolve);

      workerRef.current.postMessage({
        type: "filter",
        logs,
        filter,
        requestId,
      });
    });
  }, []);

  return { filterLogs };
}
