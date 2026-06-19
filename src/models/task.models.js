/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose, { Schema } from "mongoose";
import { AvailableTaskStatuses, TaskStatusEnum } from "../utils/constants.js";

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: AvailableTaskStatuses,
      default: TaskStatusEnum.TODO,
      required: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    attachments: {
      type: [{ url: String, mimeType: String, size: Number }],
      default: [],
    }, // Array of file URLs or paths
  },
  { timestamps: true },
);

export const Task = mongoose.model("Task", taskSchema);
