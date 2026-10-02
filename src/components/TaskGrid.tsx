"use client";

import { useEffect, useState, useCallback } from "react";
import { Task } from "@/lib/types";
import { TaskCard } from "./TaskCard";

export function TaskGrid() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      setErrorMsg(error.message || "Could not connect to MongoDB server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // Listen for custom event when a task is created
    const handleTaskAdded = () => fetchTasks();
    window.addEventListener("taskAdded", handleTaskAdded);

    return () => {
      window.removeEventListener("taskAdded", handleTaskAdded);
    };
  }, [fetchTasks]);

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
        <div className="flex justify-end">
          <button
            onClick={handleGlobalReset}
            className="text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors px-3 py-1.5 rounded-full flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Reset All Timers
          </button>
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
