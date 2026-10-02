"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f97316", // Orange
  "#06b6d4", // Cyan
];

export function AddTaskModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add task");
      }

      // Notify TaskGrid to re-fetch
      window.dispatchEvent(new Event("taskAdded"));
      setOpen(false);
      setName("");
      setColor(PRESET_COLORS[0]);
    } catch (error: any) {
      console.error("Error creating task:", error);
      setErrorMsg(error?.message || "Failed to save task to MongoDB.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Task</DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs mt-2">
            <p className="font-semibold mb-1">MongoDB Error:</p>
            <p>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700">Task Name</Label>
            <Input 
              id="name" 
              placeholder="e.g., Study, Work, Exercise" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-400"
              required
              autoFocus
            />
          </div>
          
          <div className="space-y-3">
            <Label className="text-slate-700">Task Color</Label>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                    color === c ? "border-slate-800 scale-105 shadow-md" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting || !name.trim()}
            className="w-full flex justify-center py-2.5 px-4 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus:ring-offset-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isSubmitting ? "Adding..." : "Create Task"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
