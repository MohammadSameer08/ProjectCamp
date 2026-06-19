/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Project } from "../models/project.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { UserRolesEnum } from "../utils/constants.js";
import { ApiResponse } from "../utils/api-response.js";

// @ts-ignore

export const getProjects = asyncHandler(async (req, res) => {});
// @ts-ignore
export const deleteProject = asyncHandler(async (req, res) => {
  const { params } = req.params;
  const project = await Project.findByIdAndDelete(params.id);
  if (!project) {
    throw new ApiError(404, "Project not found", undefined);
  }
  res
    .status(200)
    .json(new ApiResponse(200, project, "Project deleted successfully"));
});

// @ts-ignore
export const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.create({
    name: name,
    description: description,
    user: new mongoose.Types.ObjectId(req.user._id), // we will get the user id from the req.user which we set in middleware req.user = user and next().
  });

  await ProjectMember.create({
    name: name,
    projectId: new mongoose.Types.ObjectId(project._id),
    userId: new mongoose.Types.ObjectId(req.user._id), // we will get the user id from the req.user which we set in middleware req.user = user and next().
    role: UserRolesEnum.ADMIN, // the user who created the project will be the admin of the project
  });

  res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

// @ts-ignore
export const getProjectById = asyncHandler(async (req, res) => {});

// @ts-ignore
export const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { params } = req.params;
  const project = await Project.findByIdAndUpdate(
    params.id,
    { name, description },
    { new: true },
  );
  if (!project) {
    throw new ApiError(404, "Project not found", undefined);
  }
  res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

// @ts-ignore
export const addMembersToProject = asyncHandler(async (req, res) => {});

// @ts-ignore
export const getProjectMembers = asyncHandler(async (req, res) => {});

// @ts-ignore
export const updateMemberRole = asyncHandler(async (req, res) => {});

// @ts-ignore
export const deleteMember = asyncHandler(async (req, res) => {});
