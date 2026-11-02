import { TaskGrid } from "@/components/TaskGrid";
import { SaveDailyModal } from "@/components/SaveDailyModal";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex-1">
        <TaskGrid />
      </div>
    </div>
  );
}
