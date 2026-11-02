"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Task } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { useTimer } from "./TimerContext";
import { Trash2 } from "lucide-react";

function formatMs(ms: number): string {
  const safeMs = Math.max(0, ms);
  const hrs = Math.floor(safeMs / 3600000);
  const mins = Math.floor((safeMs % 3600000) / 60000);
  const secs = Math.floor((safeMs % 60000) / 1000);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TaskCard({ task }: { task: Task }) {
  const { activeLog, startTimer, stopTimer } = useTimer();
  const isActive = activeLog?.taskId === task.id;

  // Live 1-second ticker when active
  const [currentMs, setCurrentMs] = useState(0);

  // Store the last known duration so stopping never flickers backward to the previous session
  const lastActiveDurationRef = useRef<number>(task.accumulatedTime || 0);

  // Synchronize when task.accumulatedTime changes from server
  useEffect(() => {
    if (task.accumulatedTime === 0) {
      lastActiveDurationRef.current = 0;
    } else if (task.accumulatedTime && task.accumulatedTime > lastActiveDurationRef.current) {
      lastActiveDurationRef.current = task.accumulatedTime;
    }
  }, [task.accumulatedTime]);

  // Run ticking interval only while this task is actively running
  useEffect(() => {
    if (!isActive) return;

    setCurrentMs(Date.now());
    const interval = setInterval(() => {
      setCurrentMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Compute elapsed string reactively
  const elapsedStr = useMemo(() => {
    if (isActive && activeLog) {
      const getStartTimeMs = () => {
        const st = activeLog.startTime;
        if (st) {
          if (typeof st === "string" || typeof st === "number") return new Date(st).getTime();
          if (st instanceof Date) return st.getTime();
        }
        return currentMs || Date.now();
      };

      const startMs = getStartTimeMs();
      const now = currentMs || Date.now();
      const currentElapsed = Math.max(0, now - startMs) + (task.accumulatedTime || 0);
      lastActiveDurationRef.current = Math.max(lastActiveDurationRef.current, currentElapsed);
      return formatMs(currentElapsed);
    }

    // When inactive, show the max of latest accumulated time and last recorded session
    const diff = Math.max(task.accumulatedTime || 0, lastActiveDurationRef.current);
    return formatMs(diff);
  }, [isActive, activeLog, currentMs, task.accumulatedTime]);

  // Convert hex color to rgba for a subtle background tint
  const hexToRgba = (hex: string, opacity: number) => {
    let r = 0,
      g = 0,
      b = 0;
    if (hex?.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex?.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const bgStyle = {
    backgroundColor: isActive ? hexToRgba(task.color, 0.14) : hexToRgba(task.color, 0.035),
  };

  const textStyle = {
    color: task.color,
  };

  const handleClick = () => {
    if (isActive) {
      stopTimer();
    } else {
      startTimer(task.id);
    }
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to reset the tracked time for "${task.name}"?`)) return;

    lastActiveDurationRef.current = 0;
    try {
      const res = await fetch(`/api/time-logs?taskId=${task.id}`, { method: "DELETE" });
      if (res.ok) {
        window.dispatchEvent(new Event("taskAdded"));
      }
    } catch (error) {
      console.error("Failed to reset timer:", error);
    }
  };

  return (
    <Card
      onClick={handleClick}
      className={`relative overflow-hidden transition-all cursor-pointer group rounded-[28px] border border-slate-200/90 shadow-none hover:border-slate-300 ${isActive ? "scale-[1.02] shadow-md ring-2 ring-current" : "hover:scale-[1.01]"
        }`}
      style={{
        ...bgStyle,
        color: isActive ? task.color : "inherit",
      }}
    >
      {isActive && (
        <div
          className="absolute inset-0 opacity-10 animate-pulse pointer-events-none"
          style={{ backgroundColor: task.color }}
        />
      )}

      <CardContent className="p-6 flex flex-col justify-between h-full min-h-[100px] relative z-10 text-slate-900">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-lg" style={textStyle}>
            {task.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md cursor-pointer"
              title="Reset Timer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="relative flex items-center justify-center w-5 h-5">
              {isActive && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-75"
                  style={{ backgroundColor: task.color }}
                />
              )}
              <div
                className="w-3.5 h-3.5 rounded-full shadow-xs"
                style={{ backgroundColor: task.color }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between group">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              {isActive ? "ELAPSED TIME" : "TODAY'S TOTAL"}
            </span>
            <span
              className={`text-3xl font-mono font-bold tracking-tight ${isActive ? "" : "text-slate-400 group-hover:text-slate-500 transition-colors"
                }`}
              style={isActive ? textStyle : undefined}
            >
              {elapsedStr}
            </span>
          </div>
          {!isActive && (
            <span className="text-xs font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pb-1">
              Click to start
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
