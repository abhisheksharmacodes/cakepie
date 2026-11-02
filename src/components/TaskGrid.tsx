"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Task } from "@/lib/types";
import { TaskCard } from "./TaskCard";
import { SaveDailyModal } from "./SaveDailyModal";
import { useTimer } from "./TimerContext";
import { Save, RotateCcw, Clock } from "lucide-react";

export function TaskGrid() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { activeLog } = useTimer();
  const [currentMs, setCurrentMs] = useState(0);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch tasks");
      }
      const data: Task[] = await res.json();
      setTasks(data);
      setErrorMsg(null);
    } catch (error: unknown) {
      console.error("Error fetching tasks:", error);
      const msg = error instanceof Error ? error.message : "Could not connect to MongoDB server";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();

    // Listen for custom events
    const handleRefresh = () => {
      void fetchTasks();
    };
    window.addEventListener("taskAdded", handleRefresh);
    window.addEventListener("dailyRecordSaved", handleRefresh);

    return () => {
      window.removeEventListener("taskAdded", handleRefresh);
      window.removeEventListener("dailyRecordSaved", handleRefresh);
    };
  }, [fetchTasks]);

  // Update currentMs every second if a timer is active
  useEffect(() => {
    if (!activeLog) return;
    setCurrentMs(Date.now());
    const interval = setInterval(() => setCurrentMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeLog]);

  // Calculate live total time today across all tasks
  const totalTodayFormatted = useMemo(() => {
    let totalMs = tasks.reduce((sum, t) => sum + (t.accumulatedTime || 0), 0);
    if (activeLog) {
      const st = activeLog.startTime;
      let startMs = currentMs || Date.now();
      if (st) {
        if (typeof st === "string" || typeof st === "number") startMs = new Date(st).getTime();
        else if (st instanceof Date) startMs = st.getTime();
      }
      totalMs += Math.max(0, (currentMs || Date.now()) - startMs);
    }

    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [tasks, activeLog, currentMs]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500 mr-3"></div>
        Loading tasks from MongoDB...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 my-4">
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          MongoDB Connection Error
        </h3>
        <p className="text-sm text-red-300/80 mb-3">{errorMsg}</p>
        <p className="text-xs text-zinc-400">
          Make sure your MongoDB server is running locally (e.g. `mongodb://127.0.0.1:27017`) or set a valid `MONGODB_URI` environment variable in `.env.local`.
        </p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 px-4 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
        <p className="text-slate-500 text-lg">No tasks found. Add a new task to get started!</p>
      </div>
    );
  }

  const handleGlobalReset = async () => {
    if (!confirm("Are you sure you want to reset all tracked time across all tasks? This cannot be undone.")) return;

    try {
      const res = await fetch("/api/time-logs", { method: "DELETE" });
      if (res.ok) {
        window.dispatchEvent(new Event("taskAdded"));
      }
    } catch (error) {
      console.error("Failed to reset all timers:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 px-6 rounded-3xl border border-slate-200/90 shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">
                Today&apos;s Total Recorded Time
              </span>
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {totalTodayFormatted}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleGlobalReset}
              className="text-xs font-semibold bg-red-50/40 text-red-500 hover:bg-red-100/60 border border-red-200/80 transition-colors px-3.5 py-2 rounded-full flex items-center gap-1.5 cursor-pointer"
              title="Reset timers across all tasks"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
