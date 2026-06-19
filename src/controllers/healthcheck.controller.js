/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";

// @ts-ignore
export const healthCheck = (req, res) => {
  try {
    const response = new ApiResponse(200, {}, "Server is healthy");
    res.status(response.statusCode).json(response);
  } catch (error) {
    const response = new ApiError(500, "Server is unhealthy", undefined);
    res.status(response.statusCode).json(response);
  }
};
