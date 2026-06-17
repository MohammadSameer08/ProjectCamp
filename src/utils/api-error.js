// @ts-nocheck
export class ApiError extends Error {
  constructor(
    statusCode,
    message = "An error occurred",
    // @ts-ignore
    error = [],
    stack = "",
  ) {
    super(message);

    this.statusCode = statusCode;
    this.message = message; // <-- Add this
    this.success = false;
    this.error = error;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
