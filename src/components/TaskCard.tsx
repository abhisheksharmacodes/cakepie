"use client";

import { useEffect, useState } from "react";
import { Task } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { useTimer } from "./TimerContext";

export function TaskCard({ task }: { task: Task }) {
  const { activeLog, startTimer, stopTimer } = useTimer();
  const [elapsedStr, setElapsedStr] = useState("00:00:00");
  
  const isActive = activeLog?.taskId === task.id;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && activeLog) {
      const getStartTimeMs = () => {
        const st = activeLog.startTime;
        if (st) {
          if (typeof st === "string" || typeof st === "number") return new Date(st).getTime();
          if (st instanceof Date) return st.getTime();
          if (typeof (st as any).toMillis === "function") return (st as any).toMillis();
          if (typeof (st as any).seconds === "number") return (st as any).seconds * 1000;
        }
        return Date.now();
      };

      const startMs = getStartTimeMs();

      const updateTimer = () => {
        const now = Date.now();
        // Add previous accumulated time from the last 24 hours to the current active session
        const diff = Math.max(0, now - startMs) + (task.accumulatedTime || 0);
        
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        
        setElapsedStr(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      // If not active, show the accumulated time for the day
      const diff = task.accumulatedTime || 0;
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsedStr(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, activeLog]);

  // Convert hex color to rgba for a subtle background tint
  const hexToRgba = (hex: string, opacity: number) => {
    let r = 0, g = 0, b = 0;
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
    backgroundColor: isActive ? hexToRgba(task.color, 0.15) : hexToRgba(task.color, 0.03),
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
      className={`relative overflow-hidden transition-all cursor-pointer group rounded-3xl border-none ${
        isActive ? 'scale-[1.03] shadow-lg shadow-current' : 'hover:scale-[1.02] shadow-sm hover:shadow-md'
      }`}
      style={{
        ...bgStyle,
        color: isActive ? task.color : 'inherit', // for shadow color
      }}
    >
      {isActive && (
        <div 
          className="absolute inset-0 opacity-10 animate-pulse pointer-events-none" 
          style={{ backgroundColor: task.color }} 
        />
      )}
      
      <CardContent className="p-6 flex flex-col justify-between h-full min-h-[160px] relative z-10 text-slate-900">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg" style={textStyle}>
            {task.name}
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"
              title="Reset Timer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <div className="relative flex items-center justify-center w-6 h-6">
              {isActive && (
                <div 
                  className="absolute inset-0 rounded-full animate-ping opacity-75"
                  style={{ backgroundColor: task.color }}
                />
              )}
              <div 
                className="relative w-4 h-4 rounded-full shadow-inner z-10" 
                style={{ backgroundColor: task.color }}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-end justify-between group">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {isActive ? 'Elapsed Time' : "Today's Total"}
            </span>
            <span 
              className={`text-3xl font-mono font-bold tracking-tight ${isActive ? '' : 'text-slate-400 group-hover:text-slate-600 transition-colors'}`} 
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
