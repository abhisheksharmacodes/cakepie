"use client";

import { Pie, PieChart, Cell } from "recharts";
import { TrendingUp, Clock } from "lucide-react";
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

export function AnalyticsDashboard({ 
  chartData,
  totalSeconds
}: { 
  chartData: { taskName: string; duration: number; fill: string; hours: number }[];
  totalSeconds: number;
}) {
  const chartConfig = chartData.reduce((acc, item, index) => {
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
      return `${hrs} hour${hrs > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : ''}`.trim();
    } else if (mins > 0) {
      return `${mins} min${mins > 1 ? 's' : ''}`;
    } else {
      return `${secs} sec${secs !== 1 ? 's' : ''}`;
    }
  };

  const totalHrs = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Clock className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No completed time logs found.</p>
        <p className="text-sm">Start tracking time to see your analytics!</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      <Card className="bg-white border-slate-200 text-slate-900 shadow-lg rounded-3xl">
        <CardHeader className="items-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Time Distribution</CardTitle>
          <CardDescription className="text-slate-500">Total tracked time across all completed tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[400px] px-0"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="taskName" valueFormatter={(val: any) => formatDuration(Number(val))} />}
              />
              <Pie
                data={chartData}
                dataKey="duration"
                nameKey="taskName"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                labelLine={false}
                label={({ payload, ...props }) => {
                  return (
                    <text
                      cx={props.cx}
                      cy={props.cy}
                      x={props.x}
                      y={props.y}
                      textAnchor={props.textAnchor}
                      dominantBaseline={props.dominantBaseline}
                      fill={payload.fill}
                      className="font-bold text-sm"
                    >
                      {payload.taskName} ({formatDuration(payload.duration)})
                    </text>
                  )
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm pt-6 pb-8 border-t border-slate-200/50 mt-4">
          <div className="flex items-center gap-2 font-medium text-lg text-slate-900">
            Total Tracked Time: {totalHrs}h {totalMins}m <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="leading-none text-slate-500 text-center max-w-sm">
            This chart breaks down the total hours spent on each individual task out of all your completed timer sessions.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
