"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTimer } from "./TimerContext";
import { SaveDailyModal } from "./SaveDailyModal";
import { Clock, BarChart3, CheckSquare, Save } from "lucide-react";
import { AddTaskModal } from "@/components/AddTaskModal";
import { Plus } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { activeLog } = useTimer();

  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base leading-none">
                CakePie
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Daily Time Tracker
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 ml-2">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pathname === "/"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Tasks
            </Link>
            <Link
              href="/analytics"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pathname.startsWith("/analytics")
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {activeLog && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Tracking Active</span>
            </div>
          )}

          <SaveDailyModal>
            <button
              type="button"
              className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-sm shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer"
              title="Save final recorded time into database for today"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Daily Time</span>
              <span className="sm:hidden">Save</span>
            </button>
          </SaveDailyModal>
          <AddTaskModal>
            <button className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-orange-500/25 active:scale-95 text-sm cursor-pointer">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Task</span>
            </button>
          </AddTaskModal>
        </div>
      </div>
    </header>
  );
}

