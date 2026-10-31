import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { DailyRecordModel } from "@/models/DailyRecord";
import { TaskModel } from "@/models/Task";
import { TimeLogModel } from "@/models/TimeLog";

interface ClientTaskEntry {
  taskId?: string;
  taskName?: string;
  color?: string;
  duration?: number;
}

function formatDurationMs(ms: number): string {
  const safeMs = Math.max(0, ms);
  const hrs = Math.floor(safeMs / 3600000);
  const mins = Math.floor((safeMs % 3600000) / 60000);
  const secs = Math.floor((safeMs % 60000) / 1000);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    if (dateParam) {
      const record = await DailyRecordModel.findOne({ date: dateParam });
      if (!record) {
        return NextResponse.json({ record: null });
      }
      return NextResponse.json({
        record: {
          id: record._id.toString(),
          date: record.date,
          totalDuration: record.totalDuration,
          formattedTotalTime: record.formattedTotalTime,
          taskEntries: record.taskEntries,
          notes: record.notes,
          savedAt: record.savedAt,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      });
    }

    const records = await DailyRecordModel.find({})
      .sort({ date: -1, savedAt: -1 })
      .limit(limit);

    const formattedRecords = records.map((r) => ({
      id: r._id.toString(),
      date: r.date,
      totalDuration: r.totalDuration,
      formattedTotalTime: r.formattedTotalTime,
      taskEntries: r.taskEntries,
      notes: r.notes,
      savedAt: r.savedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    // Check if today already has a record
    const todayStr = new Date().toISOString().split("T")[0];
    const todayRecord = formattedRecords.find((r) => r.date === todayStr) || null;

    return NextResponse.json({
      records: formattedRecords,
      todayRecord,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch daily records";
    console.error("GET /api/daily-records error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const {
      date,
      notes,
      resetAfterSave = false,
      clientEntries,
    } = body as {
      date?: string;
      notes?: string;
      resetAfterSave?: boolean;
      clientEntries?: ClientTaskEntry[];
    };

    // 1. Finalize any currently running timer so elapsed time is included
    await TimeLogModel.updateMany(
      { status: "running" },
      { $set: { status: "completed", endTime: new Date() } }
    );

    // 2. Determine target date (default YYYY-MM-DD)
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Compute start of that date (or past 24 hours)
    const dateParts = targetDate.split("-").map(Number);
    const startOfDay = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);

    // 3. Fetch completed logs
    const completedLogs = await TimeLogModel.find({
      status: "completed",
      endTime: { $gte: startOfDay },
    });

    const tasks = await TaskModel.find({});
    const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

    const computedDurations: Record<string, number> = {};
    for (const log of completedLogs) {
      if (log.startTime && log.endTime) {
        const start = Math.max(startOfDay.getTime(), new Date(log.startTime).getTime());
        const end = new Date(log.endTime).getTime();
        if (end > start) {
          const tid = log.taskId.toString();
          computedDurations[tid] = (computedDurations[tid] || 0) + (end - start);
        }
      }
    }

    // 4. Merge with clientEntries if provided (to account for active sessions on client)
    const clientDurations: Record<string, number> = {};
    if (Array.isArray(clientEntries)) {
      for (const entry of clientEntries) {
        if (entry.taskId && typeof entry.duration === "number") {
          clientDurations[entry.taskId] = Math.max(
            clientDurations[entry.taskId] || 0,
            entry.duration
          );
        }
      }
    }

    // Combine task entries
    const allTaskIds = new Set([
      ...Array.from(taskMap.keys()),
      ...Object.keys(computedDurations),
      ...Object.keys(clientDurations),
    ]);

    const taskEntries: Array<{
      taskId?: string;
      taskName: string;
      color: string;
      duration: number;
      formattedTime: string;
    }> = [];

    let totalDuration = 0;

    for (const tid of allTaskIds) {
      const task = taskMap.get(tid);
      const computed = computedDurations[tid] || 0;
      const fromClient = clientDurations[tid] || 0;
      const duration = Math.max(computed, fromClient);

      const taskName = task?.name || clientEntries?.find((e) => e.taskId === tid)?.taskName || "Unknown Task";
      const color = task?.color || clientEntries?.find((e) => e.taskId === tid)?.color || "#3b82f6";

      // Include all tasks that have tracked time > 0, or if none have time, include all available
      if (duration > 0) {
        taskEntries.push({
          taskId: tid,
          taskName,
          color,
          duration,
          formattedTime: formatDurationMs(duration),
        });
        totalDuration += duration;
      }
    }

    // If no task had > 0 time, include registered tasks with 00:00:00 so the record is still saved
    if (taskEntries.length === 0) {
      for (const task of tasks) {
        taskEntries.push({
          taskId: task._id.toString(),
          taskName: task.name,
          color: task.color,
          duration: 0,
          formattedTime: "00:00:00",
        });
      }
    }

    const formattedTotalTime = formatDurationMs(totalDuration);

    // 5. Upsert record for targetDate
    const updatedRecord = await DailyRecordModel.findOneAndUpdate(
      { date: targetDate },
      {
        $set: {
          date: targetDate,
          totalDuration,
          formattedTotalTime,
          taskEntries,
          notes: notes?.trim() || "",
          savedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    // 6. If requested, reset today's time logs
    if (resetAfterSave) {
      await TimeLogModel.deleteMany({});
    }

    return NextResponse.json(
      {
        success: true,
        record: {
          id: updatedRecord._id.toString(),
          date: updatedRecord.date,
          totalDuration: updatedRecord.totalDuration,
          formattedTotalTime: updatedRecord.formattedTotalTime,
          taskEntries: updatedRecord.taskEntries,
          notes: updatedRecord.notes,
          savedAt: updatedRecord.savedAt,
          createdAt: updatedRecord.createdAt,
          updatedAt: updatedRecord.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save daily record";
    console.error("POST /api/daily-records error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const date = searchParams.get("date");

    if (id) {
      await DailyRecordModel.findByIdAndDelete(id);
      return NextResponse.json({ message: "Daily record deleted" });
    } else if (date) {
      await DailyRecordModel.findOneAndDelete({ date });
      return NextResponse.json({ message: `Daily record for ${date} deleted` });
    }

    return NextResponse.json(
      { error: "id or date parameter is required" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete daily record";
    console.error("DELETE /api/daily-records error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
