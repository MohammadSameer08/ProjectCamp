/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Project = mongoose.model("Project", projectSchema);
