// @ts-ignore
const asyncHandler = (requestHandler) => {
  // @ts-ignore
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
