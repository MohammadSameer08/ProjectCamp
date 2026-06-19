/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose, { Schema } from "mongoose";

const subtaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    isCompleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Subtask = mongoose.model("Subtask", subtaskSchema);
