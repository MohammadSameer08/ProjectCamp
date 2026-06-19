/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose, { Schema } from "mongoose";
import { AvailableUserRoles, UserRolesEnum } from "../utils/constants.js";

const projectMemberSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: AvailableUserRoles,
      default: UserRolesEnum.MEMBER,
      required: true,
    },
  },
  { timestamps: true },
);

export const ProjectMember = mongoose.model(
  "ProjectMember",
  projectMemberSchema,
);
