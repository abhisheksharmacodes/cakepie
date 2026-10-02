import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TimeLogModel } from "@/models/TimeLog";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const logs = await TimeLogModel.find(query).sort({ createdAt: -1 });
    const formatted = logs.map((l) => ({
      id: l._id.toString(),
      taskId: l.taskId.toString(),
      startTime: l.startTime,
      endTime: l.endTime,
      status: l.status,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET /api/time-logs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch time logs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { action, taskId } = body;

    // Stop active running timer if any exists
    if (action === "stop" || action === "start") {
      await TimeLogModel.updateMany(
        { status: "running" },
        { $set: { status: "completed", endTime: new Date() } }
      );
    }

    if (action === "start") {
      if (!taskId) {
        return NextResponse.json({ error: "taskId is required to start a timer" }, { status: 400 });
      }

      const newLog = await TimeLogModel.create({
        taskId,
        startTime: new Date(),
        status: "running",
      });

      return NextResponse.json({
        id: newLog._id.toString(),
        taskId: newLog.taskId.toString(),
        startTime: newLog.startTime,
        endTime: newLog.endTime,
        status: newLog.status,
      }, { status: 201 });
    }

    return NextResponse.json({ message: "Active timer stopped successfully" });
  } catch (error: any) {
    console.error("POST /api/time-logs error:", error);
    return NextResponse.json({ error: error.message || "Failed to update timer log" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (taskId) {
      await TimeLogModel.deleteMany({ taskId });
      return NextResponse.json({ message: "Time logs reset for task" });
    } else {
      await TimeLogModel.deleteMany({});
      return NextResponse.json({ message: "All time logs reset globally" });
    }
  } catch (error: any) {
    console.error("DELETE /api/time-logs error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset timers" }, { status: 500 });
  }
}
