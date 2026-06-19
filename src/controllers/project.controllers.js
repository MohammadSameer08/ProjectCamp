/* eslint-disable @typescript-eslint/ban-ts-comment */ 
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Project } from "../models/project.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { AvailableTaskStatuses, UserRolesEnum } from "../utils/constants.js";
import { ApiResponse } from "../utils/api-response.js";

// @ts-ignore

export const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user._id), // we will get the user id from the req.user which we set in middleware req.user = user and next().
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "projects",
        foreignField: "_id",
        as: "project",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "user",
            },
          },
          { $addFields: { members: { $size: "$projectmembers" } } },
        ],
      },
    },
    { $unwind: "$project" },
    {
      $project: {
        project: {
          _id: 1,
          name: 11,
          description: 1,
          members: 1,
          role: 1,
          createdAt: 1,
          updatedAt: 1,
        },
        role: 1,
        _id: 0,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});
// @ts-ignore
export const deleteProject = asyncHandler(async (req, res) => {
  const { params } = req.params;
  const project = await Project.findByIdAndDelete(params.id);
  if (!project) {
    throw new ApiError(404, "Project not found", undefined);
  }
  return res
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

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

// @ts-ignore
export const getProjectById = asyncHandler(async (req, res) => {
  const { params } = req.params;
  const project = await ProjectMember.findById({ projectId: params.id });
  if (!project) {
    throw new ApiError(404, "Project not found", undefined);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project fetched successfully"));
});

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
  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

// @ts-ignore
export const addMembersToProject = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const projectId = req.params.id;

  const user = await User.findOne({ email: email });
  if (!user) {
    throw new ApiError(404, "User not found", undefined);
  }
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found", undefined);
  }
  await ProjectMember.findByIdAndUpdate(
    {
      user: new mongoose.Types.ObjectId(user._id),
      project: new mongoose.Types.ObjectId(project._id),
    },
    {
      user: new mongoose.Types.ObjectId(user._id),
      project: new mongoose.Types.ObjectId(project._id),
      role: role,
    },
    {
      upsert: true, // if the user is not already a member of the project, create a new membership
      new: true, // return the updated document
    },
  );
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member added to project successfully"));
});

// @ts-ignore
export const getProjectMembers = asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found", undefined);
  }

  const projectMembers = await ProjectMember.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        user: { $arrayElemAt: ["$user", 0] }, // we are using $arrayElemAt to get the first element of the user array because we are using $lookup to join the users collection and it returns an array of users but we know that there will be only one user for each project member so we are using $arrayElemAt to get the first element of the user array
      },
    },
    {
      $project: {
        projectId: 1,
        userId: 1,
        role: 1,
        user: 1,
        createdAt: 1,
        updatedAt: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMembers,
        "Project members retrieved successfully",
      ),
    );
});

// @ts-ignore
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId, projectId } = req.params;
  const { newRole } = req.body;

  if (!AvailableTaskStatuses.includes(newRole)) {
    throw new ApiError(400, "Invalid role provided", undefined);
  }
  let projectMember = await ProjectMember.findOne({
    user: new mongoose.Types.ObjectId(userId),
    project: new mongoose.Types.ObjectId(projectId),
  });

  if (!projectMember) {
    throw new ApiError(404, "Project member not found", undefined);
  }

  projectMember = await ProjectMember.findByIdAndUpdate(
    projectMember._id,
    { role: newRole },
    { new: true },
  );

  if (!projectMember) {
    throw new ApiError(404, "Project member not found", undefined);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member role updated successfully",
      ),
    );
});

// @ts-ignore
export const deleteMember = asyncHandler(async (req, res) => {
  const { userId, projectId } = req.params;
  let projectMember = await ProjectMember.findOne({
    user: new mongoose.Types.ObjectId(userId),
    project: new mongoose.Types.ObjectId(projectId),
  });
  if (!projectMember) {
    throw new ApiError(404, "Project member not found", undefined);
  }
  projectMember = await ProjectMember.findByIdAndDelete(projectMember._id);
  if (!projectMember) {
    throw new ApiError(404, "Project member not found", undefined);
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member deleted successfully",
      ),
    );
});
