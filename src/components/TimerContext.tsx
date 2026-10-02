"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { TimeLog } from "@/lib/types";

interface TimerContextType {
  activeLog: TimeLog | null;
  startTimer: (taskId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  refreshActiveLog: () => Promise<void>;
  loading: boolean;
}

const TimerContext = createContext<TimerContextType>({
  activeLog: null,
  startTimer: async () => {},
  stopTimer: async () => {},
  refreshActiveLog: async () => {},
  loading: true,
});

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveLog = useCallback(async () => {
    try {
      const res = await fetch("/api/time-logs?status=running");
      if (res.ok) {
        const logs: TimeLog[] = await res.json();
        setActiveLog(logs.length > 0 ? logs[0] : null);
      }
    } catch (error) {
      console.error("Error fetching active timer:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveLog();

    // Poll every 3 seconds for state sync
    const interval = setInterval(fetchActiveLog, 3000);
    return () => clearInterval(interval);
  }, [fetchActiveLog]);

  const stopTimer = async () => {
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (res.ok) {
        setActiveLog(null);
        window.dispatchEvent(new Event("taskAdded"));
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
    }
  };

  const startTimer = async (taskId: string) => {
    if (activeLog && activeLog.taskId === taskId) return;

    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", taskId }),
      });
      if (res.ok) {
        const newLog: TimeLog = await res.json();
        setActiveLog(newLog);
        window.dispatchEvent(new Event("taskAdded"));
      }
    } catch (error) {
      console.error("Error starting timer:", error);
    }
  };

  return (
    <TimerContext.Provider value={{ activeLog, startTimer, stopTimer, refreshActiveLog: fetchActiveLog, loading }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);
