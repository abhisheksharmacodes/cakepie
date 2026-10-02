import mongoose, { Schema, Document, models, model } from "mongoose";

export interface ITimeLog extends Document {
  taskId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date | null;
  status: "running" | "completed";
}

const TimeLogSchema = new Schema<ITimeLog>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    startTime: { type: Date, default: Date.now, required: true },
    endTime: { type: Date, default: null },
    status: { type: String, enum: ["running", "completed"], default: "running", required: true },
  },
  { timestamps: true }
);

export const TimeLogModel = models.TimeLog || model<ITimeLog>("TimeLog", TimeLogSchema);
