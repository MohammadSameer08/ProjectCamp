/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose, { Schema } from "mongoose";

const projectNoteSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    content: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Note = mongoose.model("Note", projectNoteSchema);
