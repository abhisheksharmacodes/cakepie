import { TaskGrid } from "@/components/TaskGrid";
import { AddTaskModal } from "@/components/AddTaskModal";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 py-8 h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Your Tasks</h2>
          <p className="text-slate-500 mt-1">Manage and track time across different activities.</p>
        </div>

        <AddTaskModal>
          <button className="flex items-center gap-2 bg-orange-400 hover:bg-orange-500 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-orange-400/20 active:scale-95">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Task</span>
          </button>
        </AddTaskModal>
      </div>

      <div className="flex-1">
        <TaskGrid />
      </div>
    </div>
  );
}
