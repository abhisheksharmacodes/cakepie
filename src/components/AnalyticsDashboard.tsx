"use client";

import { Pie, PieChart, Cell } from "recharts";
import { TrendingUp, Clock, Calendar, CheckCircle2, Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface DailyRecordEntry {
  id: string;
  date: string;
  totalDuration: number;
  formattedTotalTime: string;
  notes?: string;
  taskEntries: Array<{
    taskName: string;
    color: string;
    duration: number;
    formattedTime: string;
  }>;
}

export function AnalyticsDashboard({
  chartData,
  totalSeconds,
  dailyRecords = [],
  monthLabel = "Selected Month",
}: {
  chartData: { taskName: string; duration: number; fill: string; hours: number }[];
  totalSeconds: number;
  dailyRecords?: DailyRecordEntry[];
  monthLabel?: string;
}) {
  const chartConfig = chartData.reduce((acc, item) => {
    acc[item.taskName] = {
      label: item.taskName,
      color: item.fill,
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>) satisfies ChartConfig;

  // Formatting helper for duration
  const formatDuration = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins > 0 ? `${mins}m ` : ""}${secs > 0 && hrs < 2 ? `${secs}s` : ""}`.trim();
    } else if (mins > 0) {
      return `${mins}m ${secs > 0 ? `${secs}s` : ""}`.trim();
    } else {
      return `${secs}s`;
    }
  };

  const activeDaysCount = dailyRecords.filter((r) => r.totalDuration > 0).length || (chartData.length > 0 ? 1 : 0);
  const avgSecondsPerDay = activeDaysCount > 0 ? Math.floor(totalSeconds / activeDaysCount) : 0;
  const topTask = chartData[0];

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
        <Clock className="w-12 h-12 mb-4 text-slate-300" />
        <p className="text-lg font-medium text-slate-700">No recorded time found for {monthLabel}.</p>
        <p className="text-sm text-slate-400 mt-1">
          Start tracking or save your final daily recorded time to see your analytics!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            Total Time
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 mt-1">
            {formatDuration(totalSeconds)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">{monthLabel}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            Active Days
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1">
            {activeDaysCount} <span className="text-sm font-normal text-slate-400">day{activeDaysCount === 1 ? "" : "s"}</span>
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Recorded in DB</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            Daily Average
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 mt-1">
            {formatDuration(avgSecondsPerDay)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">per active day</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            Top Activity
          </span>
          <span className="text-lg font-bold text-slate-900 mt-1 truncate" title={topTask?.taskName}>
            {topTask?.taskName || "N/A"}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {topTask ? `${Math.round((topTask.duration / totalSeconds) * 100)}% of total` : ""}
          </span>
        </div>
      </div>

      {/* Main Chart Card */}
      <Card className="bg-white border-slate-200 text-slate-900 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="items-center pb-2 border-b border-slate-100">
          <CardTitle className="text-xl font-bold tracking-tight">Time Distribution by Task</CardTitle>
          <CardDescription className="text-slate-500">
            Breakdown of final recorded time for {monthLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-2">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[340px] px-0">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="taskName"
                    formatter={(val) => formatDuration(Number(val))}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="duration"
                nameKey="taskName"
                innerRadius={65}
                outerRadius={115}
                paddingAngle={3}
                labelLine={false}
                label={({ payload, ...props }) => {
                  const percent = Math.round((payload.duration / totalSeconds) * 100);
                  return (
                    <text
                      cx={props.cx}
                      cy={props.cy}
                      x={props.x}
                      y={props.y}
                      textAnchor={props.textAnchor}
                      dominantBaseline={props.dominantBaseline}
                      fill={payload.fill}
                      className="font-bold text-xs"
                    >
                      {payload.taskName} ({percent}%)
                    </text>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Tasks breakdown progress bars */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
            {chartData.map((task) => {
              const percent = totalSeconds > 0 ? Math.round((task.duration / totalSeconds) * 100) : 0;
              return (
                <div key={task.taskName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.fill }} />
                      <span className="text-slate-800">{task.taskName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600">{formatDuration(task.duration)}</span>
                      <span className="text-slate-400 w-10 text-right">{percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%`, backgroundColor: task.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-1 text-xs pt-4 pb-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Total Monthly Recorded: {formatDuration(totalSeconds)}
          </div>
        </CardFooter>
      </Card>

      {/* Daily Records Log for this Month */}
      {dailyRecords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Daily Records Saved for {monthLabel}
            </h3>
            <span className="text-xs text-slate-400">
              {dailyRecords.length} day{dailyRecords.length === 1 ? "" : "s"} logged
            </span>
          </div>

          <div className="space-y-2.5">
            {dailyRecords.map((record) => (
              <div
                key={record.id}
                className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{record.date}</span>
                    {record.notes && (
                      <span className="text-slate-500 italic max-w-xs truncate">
                        &quot;{record.notes}&quot;
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    {record.formattedTotalTime}
                  </span>
                </div>

                {record.taskEntries && record.taskEntries.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {record.taskEntries.map((task, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-700"
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
