import { connectToDatabase } from "@/lib/mongodb";
import { TimeLogModel } from "@/models/TimeLog";
import { TaskModel } from "@/models/Task";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { MonthSelector } from "@/components/MonthSelector";

// Next.js config to ensure the page dynamically renders so data is always fresh
export const dynamic = "force-dynamic";

export default async function AnalyticsPage(props: any) {
  await connectToDatabase();

  const searchParams = await Promise.resolve(props.searchParams);
  const monthParam = searchParams?.month || new Date().toISOString().slice(0, 7); // Default YYYY-MM
  
  // Create start and end dates for the selected month
  const [year, month] = monthParam.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Fetch completed time logs within the specific month, and all tasks
  const completedLogs = await TimeLogModel.find({
    status: "completed",
    endTime: { 
      $gte: startDate,
      $lte: endDate
    }
  }).lean();
  
  const tasks = await TaskModel.find({}).lean();

  // 2. Map task colors and names by taskId for easy lookup
  const taskMap: Record<string, { name: string; color: string }> = {};
  tasks.forEach((task) => {
    taskMap[task._id.toString()] = {
      name: task.name,
      color: task.color,
    };
  });

  // 3. Aggregate total duration per taskId
  const durationByTask: Record<string, number> = {};
  let totalSeconds = 0;

  completedLogs.forEach((log) => {
    if (log.startTime && log.endTime) {
      // Bound the start/end time to the selected month just in case the timer spanned across months
      const logStart = Math.max(new Date(log.startTime).getTime(), startDate.getTime());
      const logEnd = Math.min(new Date(log.endTime).getTime(), endDate.getTime());
      
      const durationSeconds = Math.max(0, Math.floor((logEnd - logStart) / 1000));
      if (durationSeconds > 0) {
        const taskIdStr = log.taskId.toString();
        durationByTask[taskIdStr] = (durationByTask[taskIdStr] || 0) + durationSeconds;
        totalSeconds += durationSeconds;
      }
    }
  });

  // 4. Transform into chartData array format for Recharts PieChart
  const chartData = Object.entries(durationByTask)
    .filter(([_, duration]) => duration > 0)
    .map(([taskId, durationSecs]) => {
      const taskInfo = taskMap[taskId] || { name: "Deleted Task", color: "#6b7280" };
      return {
        taskName: taskInfo.name,
        duration: durationSecs,
        hours: Number((durationSecs / 3600).toFixed(2)),
        fill: taskInfo.color,
      };
    })
    .sort((a, b) => b.duration - a.duration);

  return (
    <div className="flex flex-col flex-1 py-8 h-full">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h2>
          <p className="text-slate-500 mt-1">Visualize how you've been spending your tracked time.</p>
        </div>
        <MonthSelector />
      </div>

      <div className="flex-1 flex items-center justify-center">
        <AnalyticsDashboard chartData={chartData} totalSeconds={totalSeconds} />
      </div>
    </div>
  );
}
