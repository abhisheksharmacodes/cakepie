import mongoose, { Schema, Document, models, model } from "mongoose";

export interface ITask extends Document {
  name: string;
  color: string;
  createdAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true, default: "#3b82f6" },
  },
  { timestamps: true }
);

export const TaskModel = models.Task || model<ITask>("Task", TaskSchema);
