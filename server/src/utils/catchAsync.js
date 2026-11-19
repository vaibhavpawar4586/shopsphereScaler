/**
 * Wraps an async route handler so any rejected promise is passed to next(err).
 * This replaces a try/catch block in every controller (Express 4 does not do this itself).
 */
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
