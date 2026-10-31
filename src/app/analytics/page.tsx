import { connectToDatabase } from "@/lib/mongodb";
import { DailyRecordModel } from "@/models/DailyRecord";
import { TimeLogModel } from "@/models/TimeLog";
import { TaskModel } from "@/models/Task";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { MonthSelector } from "@/components/MonthSelector";

// Next.js config to ensure the page dynamically renders so data is always fresh
export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnalyticsPage(props: AnalyticsPageProps) {
  await connectToDatabase();

  const searchParams = props.searchParams ? await props.searchParams : {};
  const monthQuery = typeof searchParams.month === "string" ? searchParams.month : undefined;
  
  // Default YYYY-MM based on local or ISO date
  const monthParam = monthQuery || new Date().toISOString().slice(0, 7);
  
  // Create start and end dates for the selected month
  const [year, month] = monthParam.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Fetch saved daily records for the selected month
  const rawDailyRecords = await DailyRecordModel.find({
    date: {
      $gte: `${monthParam}-01`,
      $lte: `${monthParam}-31`,
    },
  })
    .sort({ date: -1 })
    .lean();

  const savedDates = new Set(rawDailyRecords.map((r) => r.date));

  // 2. Fetch all registered tasks for names and colors
  const tasks = await TaskModel.find({}).lean();
  const taskMap: Record<string, { name: string; color: string }> = {};
  tasks.forEach((task) => {
    taskMap[task._id.toString()] = {
      name: task.name,
      color: task.color,
    };
  });

  // 3. Aggregate duration by task from saved daily records
  const durationByTask: Record<string, { name: string; color: string; durationSeconds: number }> = {};
  let totalSeconds = 0;

  for (const record of rawDailyRecords) {
    if (Array.isArray(record.taskEntries)) {
      for (const entry of record.taskEntries) {
        const durationSecs = Math.floor((entry.duration || 0) / 1000);
        if (durationSecs > 0) {
          const key = entry.taskName;
          if (!durationByTask[key]) {
            durationByTask[key] = {
              name: entry.taskName,
              color: entry.color || "#3b82f6",
              durationSeconds: 0,
            };
          }
          durationByTask[key].durationSeconds += durationSecs;
          totalSeconds += durationSecs;
        }
      }
    }
  }

  // 4. Also include any completed raw time logs in this month that belong to dates NOT yet saved as daily records
  const completedLogs = await TimeLogModel.find({
    status: "completed",
    endTime: {
      $gte: startDate,
      $lte: endDate,
    },
  }).lean();

  for (const log of completedLogs) {
    if (log.startTime && log.endTime) {
      const logDateStr = new Date(log.endTime).toISOString().split("T")[0];
      // Only include if this day has not already been finalized as a daily record
      if (!savedDates.has(logDateStr)) {
        const logStart = Math.max(new Date(log.startTime).getTime(), startDate.getTime());
        const logEnd = Math.min(new Date(log.endTime).getTime(), endDate.getTime());
        const durationSeconds = Math.max(0, Math.floor((logEnd - logStart) / 1000));
        if (durationSeconds > 0) {
          const tid = log.taskId.toString();
          const taskInfo = taskMap[tid] || { name: "Other Task", color: "#6b7280" };
          const key = taskInfo.name;
          if (!durationByTask[key]) {
            durationByTask[key] = {
              name: taskInfo.name,
              color: taskInfo.color,
              durationSeconds: 0,
            };
          }
          durationByTask[key].durationSeconds += durationSeconds;
          totalSeconds += durationSeconds;
        }
      }
    }
  }

  // 5. Transform into chartData array format for PieChart
  const chartData = Object.values(durationByTask)
    .filter((item) => item.durationSeconds > 0)
    .map((item) => ({
      taskName: item.name,
      duration: item.durationSeconds,
      hours: Number((item.durationSeconds / 3600).toFixed(2)),
      fill: item.color,
    }))
    .sort((a, b) => b.duration - a.duration);

  // Format daily records for dashboard display
  const dailyRecordsFormatted = rawDailyRecords.map((r) => ({
    id: r._id.toString(),
    date: r.date,
    totalDuration: r.totalDuration,
    formattedTotalTime: r.formattedTotalTime,
    notes: r.notes || "",
    taskEntries: (r.taskEntries || []).map((e: any) => ({
      taskName: e.taskName,
      color: e.color || "#3b82f6",
      duration: e.duration || 0,
      formattedTime: e.formattedTime || "00:00:00",
    })),
  }));

  // Month label for display (e.g. October 2026)
  const monthDate = new Date(year, month - 1, 1);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col flex-1 py-8 h-full">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h2>
          <p className="text-slate-500 mt-1">
            Tracked time and daily recorded activity for {monthLabel}.
          </p>
        </div>
        <MonthSelector />
      </div>

      <div className="flex-1 flex flex-col">
        <AnalyticsDashboard
          chartData={chartData}
          totalSeconds={totalSeconds}
          dailyRecords={dailyRecordsFormatted}
          monthLabel={monthLabel}
        />
      </div>
    </div>
  );
}
