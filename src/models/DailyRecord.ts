import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IDailyTaskEntry {
  taskId?: mongoose.Types.ObjectId | string;
  taskName: string;
  color: string;
  duration: number; // in milliseconds
  formattedTime: string; // "HH:MM:SS"
}

export interface IDailyRecord extends Document {
  date: string; // "YYYY-MM-DD"
  totalDuration: number; // in milliseconds
  formattedTotalTime: string; // "HH:MM:SS"
  taskEntries: IDailyTaskEntry[];
  notes?: string;
  savedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyTaskEntrySchema = new Schema<IDailyTaskEntry>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: false },
    taskName: { type: String, required: true },
    color: { type: String, default: "#3b82f6" },
    duration: { type: Number, required: true, default: 0 },
    formattedTime: { type: String, required: true, default: "00:00:00" },
  },
  { _id: false }
);

const DailyRecordSchema = new Schema<IDailyRecord>(
  {
    date: { type: String, required: true, index: true },
    totalDuration: { type: Number, required: true, default: 0 },
    formattedTotalTime: { type: String, required: true, default: "00:00:00" },
    taskEntries: [DailyTaskEntrySchema],
    notes: { type: String, default: "" },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const DailyRecordModel =
  models.DailyRecord || model<IDailyRecord>("DailyRecord", DailyRecordSchema);

