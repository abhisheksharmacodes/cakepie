"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTimer } from "./TimerContext";
import { Task, DailyRecord } from "@/lib/types";
import {
  CalendarCheck,
  Clock,
  Save,
  CheckCircle2,
  History,
  Trash2,
  AlertCircle,
  Calendar,
  Sparkles,
} from "lucide-react";

function formatMs(ms: number) {
  const safeMs = Math.max(0, ms);
  const hrs = Math.floor(safeMs / 3600000);
  const mins = Math.floor((safeMs % 3600000) / 60000);
  const secs = Math.floor((safeMs % 60000) / 1000);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function SaveDailyModal({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"save" | "history">("save");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize selectedDate on mount safely
  const [selectedDate, setSelectedDate] = useState("");

  const [notes, setNotes] = useState("");
  const [resetAfterSave, setResetAfterSave] = useState(false);

  // History state
  const [historyRecords, setHistoryRecords] = useState<DailyRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<DailyRecord | null>(null);

  const { activeLog } = useTimer();
  const [currentMs, setCurrentMs] = useState(0);

  // Fetch tasks and existing records
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [tasksRes, recordsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/daily-records"),
      ]);

      if (tasksRes.ok) {
        const tasksData: Task[] = await tasksRes.json();
        setTasks(tasksData);
      }

      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setHistoryRecords(data.records || []);
        setTodayRecord(data.todayRecord || null);
      }
    } catch {
      setErrorMessage("Could not load data from database.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize date and fetch data when opened
  useEffect(() => {
    if (!open) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
    setCurrentMs(Date.now());

    const timer = setInterval(() => setCurrentMs(Date.now()), 1000);

    const abortController = new AbortController();
    void loadData();

    return () => {
      clearInterval(timer);
      abortController.abort();
    };
  }, [open, loadData]);

  // Calculate live durations per task including active timer
  const taskSnapshots = useMemo(() => {
    return tasks.map((task) => {
      let duration = task.accumulatedTime || 0;

      if (activeLog && activeLog.taskId === task.id) {
        const getStartTimeMs = () => {
          const st = activeLog.startTime;
          if (st) {
            if (typeof st === "string" || typeof st === "number") return new Date(st).getTime();
            if (st instanceof Date) return st.getTime();
          }
          return currentMs || Date.now();
        };
        const elapsed = Math.max(0, (currentMs || Date.now()) - getStartTimeMs());
        duration += elapsed;
      }

      return {
        taskId: task.id,
        taskName: task.name,
        color: task.color,
        duration,
        formattedTime: formatMs(duration),
      };
    });
  }, [tasks, activeLog, currentMs]);

  const totalCalculatedMs = useMemo(() => {
    return taskSnapshots.reduce((acc, t) => acc + t.duration, 0);
  }, [taskSnapshots]);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(null);

    try {
      const payload = {
        date: selectedDate,
        notes,
        resetAfterSave,
        clientEntries: taskSnapshots,
      };

      const res = await fetch("/api/daily-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save daily record");
      }

      setSaveSuccess(
        `Daily record for ${selectedDate} saved successfully! Total: ${data.record.formattedTotalTime}`
      );
      setTodayRecord(data.record);

      // Refresh records and tasks across the app
      window.dispatchEvent(new Event("taskAdded"));
      window.dispatchEvent(new Event("dailyRecordSaved"));
      void loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save daily record to database.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string, dateStr: string) => {
    if (!confirm(`Are you sure you want to delete the daily record for ${dateStr}?`)) return;

    try {
      const res = await fetch(`/api/daily-records?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistoryRecords((prev) => prev.filter((r) => r.id !== id));
        if (todayRecord?.id === id) {
          setTodayRecord(null);
        }
      }
    } catch (err) {
      console.error("Delete record error:", err);
    }
  };

  const activeTaskRunning = useMemo(() => {
    if (!activeLog) return null;
    return tasks.find((t) => t.id === activeLog.taskId);
  }, [activeLog, tasks]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <button className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-emerald-700/20 active:scale-95 text-sm cursor-pointer">
            <Save className="w-4 h-4" />
            <span>Save Daily Time</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="mb-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                  Save Final Recorded Time
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save today&apos;s tracked time to the database on a daily basis
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tab switcher: Save Today vs History */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("save");
              setSaveSuccess(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "save"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Record Daily Total
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              setSaveSuccess(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "history"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Saved Records ({historyRecords.length})
          </button>
        </div>

        {activeTab === "save" ? (
          <div className="space-y-4">
            {/* Today status banner if already saved */}
            {todayRecord && !saveSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold">Already saved for {todayRecord.date}!</span>
                  <span className="text-emerald-700 ml-1">
                    Recorded Total: {todayRecord.formattedTotalTime}. Saving again will update this day&apos;s record.
                  </span>
                </div>
              </div>
            )}

            {/* Active timer alert */}
            {activeTaskRunning && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Active timer running:</span> &quot;{activeTaskRunning.name}&quot;
                  <p className="text-amber-700 mt-0.5">
                    Saving will automatically stop the running timer and include its full elapsed time in this daily record.
                  </p>
                </div>
              </div>
            )}

            {/* Success message */}
            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="font-medium">{saveSuccess}</p>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="font-medium">{errorMessage}</p>
              </div>
            )}

            {/* Date Picker & Total Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Record Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex flex-col justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Total Recorded Time
                </span>
                <span className="text-2xl font-mono font-bold text-emerald-950 mt-1">
                  {formatMs(totalCalculatedMs)}
                </span>
              </div>
            </div>

            {/* Tasks Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Task Breakdown
                </h4>
                <span className="text-xs text-slate-400">
                  {taskSnapshots.filter((t) => t.duration > 0).length} of {taskSnapshots.length} tracked
                </span>
              </div>

              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading tasks...</div>
              ) : taskSnapshots.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No tasks found. Create a task first to track time.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {taskSnapshots.map((item) => (
                    <div
                      key={item.taskId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-slate-800">{item.taskName}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        {item.formattedTime}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes input */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Daily Notes / Summary (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key accomplishments or notes for today..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Reset option */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={resetAfterSave}
                onChange={(e) => setResetAfterSave(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Reset active day timer counters after saving to start fresh</span>
            </label>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save to Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Daily Records Stored in MongoDB
              </h4>
              <span className="text-xs text-slate-400">
                {historyRecords.length} recorded day{historyRecords.length === 1 ? "" : "s"}
              </span>
            </div>

            {historyRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>No daily records saved yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Switch to &quot;Record Daily Total&quot; and save your first day!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {historyRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-900 text-sm">{record.date}</span>
                        {record.date === selectedDate && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[10px]">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          {record.formattedTotalTime}
                        </span>
                        <button
                          onClick={() => handleDeleteRecord(record.id, record.date)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {record.notes && (
                      <p className="mt-2 text-slate-600 bg-white p-2 rounded-xl border border-slate-100 text-[11px] italic">
                        &quot;{record.notes}&quot;
                      </p>
                    )}

                    {/* Mini Task pills */}
                    {record.taskEntries && record.taskEntries.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex flex-wrap gap-1.5">
                        {record.taskEntries.map((task, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: task.color || "#3b82f6" }}
                            />
                            <span>{task.taskName}:</span>
                            <span className="font-mono font-medium">{task.formattedTime}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-slate-400 text-right">
                      Saved: {new Date(record.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
