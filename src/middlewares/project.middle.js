/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";
import { asyncHandler } from "../utils/async-handler.js";

// @ts-ignore
export const validateProjectPermission = (roles = []) =>
  asyncHandler(
    // @ts-ignore
    async (req, res, next) => {
      const { projectId } = req.params;
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }

      const projectMember = await ProjectMember.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(req.user._id),
      });
      if (!projectMember) {
        return res.status(403).json({
          message: "You do not have permission to access this project",
        });
      }

      const userRole = projectMember.role;
      req.user.role = userRole; // we are setting the user role in the req.user object so that we can use it in the controllers to check the user role and permissions

      if (roles.length && !roles.includes(userRole)) {
        return res.status(403).json({
          message: "You do not have the required role to access this project",
        });
      }

      next();
    },
  );
