import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TimeLogModel } from "@/models/TimeLog";

export async function POST(request: Request) {
  try {
    // sendBeacon sends data as text, so we parse it manually
    const textBody = await request.text();
    if (!textBody) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    const body = JSON.parse(textBody);
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ error: "logId is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Update the specific timer to stopped using MongoDB
    await TimeLogModel.findByIdAndUpdate(
      logId,
      { 
        $set: { 
          status: "completed", 
          endTime: new Date() 
        } 
      }
    );

    return NextResponse.json({ message: "Timer stopped successfully via beacon" });
  } catch (error: any) {
    console.error("POST /api/stopTimer error:", error);
    return NextResponse.json({ error: error.message || "Failed to stop timer" }, { status: 500 });
  }
}
