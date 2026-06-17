import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

// @ts-ignore
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  // @ts-ignore
  const extractedErrors = [];
  // @ts-ignore
  errors.array().map((err) => extractedErrors.push({ [err.path]: err.msg }));
  // @ts-ignore
  throw new ApiError(422, "Validation failed", extractedErrors);
};
