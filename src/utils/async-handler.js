/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
const asyncHandler = (requestHandler) => {
  // @ts-ignore
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
