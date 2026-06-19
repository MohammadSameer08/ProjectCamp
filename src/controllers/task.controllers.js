/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Project } from "../models/project.models.js";
import { Subtask } from "../models/subtask.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { AvailableTaskStatuses, UserRolesEnum } from "../utils/constants.js";
import { ApiResponse } from "../utils/api-response.js";
import { Task } from "../models/task.models.js";

// @ts-ignore
export const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found", undefined);
  }
  const tasks = await Task.find({
    project: new mongoose.Types.ObjectId(projectId),
  }).populate("assignedTo", "username fullName avatar"); // we are populating the assignedTo field with the user details like username, fullName and avatar so that we can show the user details in the task list without making another API call to get the user details using the assignedTo user id. This will improve the performance of the application by reducing the number of API calls and also it will improve the user experience by showing the user details in the task list without making another API call to get the user details using the assignedTo user id.

  if (!tasks) {
    throw new ApiError(404, "Tasks not found", undefined);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks retrieved successfully"));
});

// @ts-ignore
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status } = req.body;
  const { projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found", undefined);
  }
  const files = req.files || [];

  // @ts-ignore
  const attachments = files.map((file) => {
    return {
      url: `${process.env.SERVER_URL}/images/${file.originalname}`,
      mimetype: file.mimetype,
      size: file.size,
    };
  });

  const task = await Task.create({
    title,
    description,
    project: new mongoose.Types.ObjectId(projectId),
    assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : null,
    status,
    assignedBy: new mongoose.Types.ObjectId(req.user._id),
    // @ts-ignore
    attachments: attachments,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

// @ts-ignore
export const getTaskById = asyncHandler(async (req, res) => {});
// @ts-ignore
export const updateTask = asyncHandler(async (req, res) => {});
// @ts-ignore
export const deleteTask = asyncHandler(async (req, res) => {});
// @ts-ignore
export const createSubtasks = asyncHandler(async (req, res) => {});
// @ts-ignore
export const updateSubtask = asyncHandler(async (req, res) => {});
// @ts-ignore
export const deleteSubtask = asyncHandler(async (req, res) => {});
