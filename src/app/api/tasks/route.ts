import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TaskModel } from "@/models/Task";
import { TimeLogModel } from "@/models/TimeLog";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Calculate the date 24 hours ago
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Fetch time logs from the last 24 hours
    const recentLogs = await TimeLogModel.find({
      status: "completed",
      endTime: { $gte: yesterday }
    });

    const accumulatedMap: Record<string, number> = {};
    for (const log of recentLogs) {
      if (log.startTime && log.endTime) {
        // Only count the portion of the log within the last 24 hours
        const start = Math.max(yesterday.getTime(), new Date(log.startTime).getTime());
        const end = new Date(log.endTime).getTime();
        if (end > start) {
          const tid = log.taskId.toString();
          accumulatedMap[tid] = (accumulatedMap[tid] || 0) + (end - start);
        }
      }
    }

    const tasks = await TaskModel.find({}).sort({ createdAt: -1 });
    const formatted = tasks.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      color: t.color,
      createdAt: t.createdAt,
      accumulatedTime: accumulatedMap[t._id.toString()] || 0,
    }));
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Task name is required" }, { status: 400 });
    }

    const newTask = await TaskModel.create({
      name: name.trim(),
      color: color || "#3b82f6",
    });

    return NextResponse.json({
      id: newTask._id.toString(),
      name: newTask.name,
      color: newTask.color,
      createdAt: newTask.createdAt,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: error.message || "Failed to create task" }, { status: 500 });
  }
}
