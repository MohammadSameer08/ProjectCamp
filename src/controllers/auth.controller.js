/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { User } from "../models/user.models.js";
// @ts-ignore
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendEmail } from "../utils/mail.js";
import { emailVerificationMailGenContent, forgotPasswordMailGenContent } from "../utils/mail.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
// @ts-ignore
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    // @ts-ignore
    const accessToken = user.generateAccessToken();
    // @ts-ignore
    const refreshToken = user.generateRefreshToken();
    // @ts-ignore
    user.refreshToken = refreshToken;
    // @ts-ignore
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Error while generating access and refresh tokens",
      undefined,
    );
  }
};

// @ts-ignore
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  // console.log("existingUser:", existingUser);
  if (existingUser) {
    const response = new ApiError(409, "Email already in use", undefined);
    return res.status(response.statusCode).json(response);
  }

  const user = await User.create({
    email,
    password,
    username,
    isEmailVerified: false,
  });

  const { unHashedToken, hashedToken, tokenExpiry } =
    // @ts-ignore
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationMailGenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken} `,
    ),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "User Created successfully and verification email has been sent on your email.",
      ),
    );
});

// @ts-ignore
export const login = asyncHandler(async (req, res) => {
  // @ts-ignore
  const { email, password, username } = req.body;
  if (!email) {
    const response = new ApiError(400, "Email is required", undefined);
    return res.status(response.statusCode).json(response);
  }

  const user = await User.findOne({ email });
  if (!user) {
    const response = new ApiError(404, "User not found", undefined);
    return res.status(response.statusCode).json(response);
  }

  // @ts-ignore
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    const response = new ApiError(401, "Invalid credentials", undefined);
    return res.status(response.statusCode).json(response);
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        { user: user, accessToken: accessToken, refreshToken: refreshToken },
        "Logged in successfully",
      ),
    );
});

// @ts-ignore
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  return res
    .status(200)
    .clearCookie("refreshToken")
    .clearCookie("accessToken")
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// @ts-ignore
export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: req.user },
        "Current user fetched successfully",
      ),
    );
});

// @ts-ignore
export const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params; // verificationToken is un-hashed token coming from the url
  if (!verificationToken) {
    const response = new ApiError(
      400,
      "Verification token is required",
      undefined,
    );
    return res.status(response.statusCode).json(response);
  }
  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    const response = new ApiError(
      400,
      "Invalid or expired verification token",
      undefined,
    );
    return res.status(response.statusCode).json(response);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: user },
        "Email verified successfully. You can now log in.",
      ),
    );
});

// @ts-ignore
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    const response = new ApiError(404, "User not found", undefined);
    return res.status(response.statusCode).json(response);
  }
  if (user.isEmailVerified) {
    const response = new ApiError(409, "Email is already verified", undefined);
    return res.status(response.statusCode).json(response);
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    // @ts-ignore
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationMailGenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken} `,
    ),
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Verification email resent successfully. Please check your email.",
      ),
    );
});
// @ts-ignore
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) {
    const response = new ApiError(400, "Refresh token is required", undefined);
    return res.status(response.statusCode).json(response);
  }
  const decodedToken = await jwt.verify(
    refreshToken,
    // @ts-ignore
    process.env.REFRESH_TOKEN_SECRET,
  );
  const user = await User.findById(decodedToken._id);
  if (!user) {
    const response = new ApiError(401, "Unauthorized", undefined);
    return res.status(response.statusCode).json(response);
  }

  const options = {
    httpOnly: true,
    secure: true,
  };
  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshTokens(user._id);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken: accessToken, refreshToken: newRefreshToken },
        "Access token refreshed successfully",
      ),
    );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    const response = new ApiError(404, "User not found", undefined);
    return res.status(response.statusCode).json(response);
  }
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });
  await sendEmail({
    email: user.email,
    subject: "Password Reset",
    mailgenContent: forgotPasswordMailGenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/reset-password/${unHashedToken} `,
    ),
  });
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset email sent successfully. Please check your email.",
      ),
    );
});

export const resetPassword = asyncHandler(async (req, res) => {
  // For URL: /reset-password/abc123xyz789def456...
  // req.params = {
  //   resetToken: "abc123xyz789def456..."
  // }

  // // For URL: /reset-password/xyz987abc654def321...
  // req.params = {
  //   resetToken: "xyz987abc654def321..."
  // }
  const { resetToken } = req.params; // resetToken is un-hashed token coming from the url
  const { newPassword } = req.body;
  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    const response = new ApiError(
      400,
      "Invalid or expired reset token",
      undefined,
    );
    return res.status(response.statusCode).json(response);
  }

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset successfully. You can now log in with your new password.",
      ),
    );
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    const response = new ApiError(404, "User not found", undefined);
    return res.status(response.statusCode).json(response);
  }
  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) {
    const response = new ApiError(
      401,
      "Current password is incorrect",
      undefined,
    );
    return res.status(response.statusCode).json(response);
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. You can now log in with your new password.",
      ),
    );
});
