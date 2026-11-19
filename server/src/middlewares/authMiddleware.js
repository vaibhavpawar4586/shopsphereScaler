const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Checks the JWT stored in the httpOnly "JWT" cookie and loads the logged-in user.
 * Adds req.user and req.userId for the next handlers.
 */
const protectRouteMiddleWare = catchAsync(async (req, res, next) => {
    const token = req.cookies && req.cookies.JWT;
    if (!token) throw new AppError(401, 'Please log in to continue');

    let decoded;
    try {
        decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
        throw new AppError(401, 'Your session has expired, please log in again');
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) throw new AppError(401, 'This account no longer exists');

    req.user = user;
    req.userId = user.id;
    next();
});

/** Allows the request only if the logged-in user has one of the given roles. */
const isAuthorizedMiddleWare = (allowedRoles) => (req, res, next) => {
    if (req.user && allowedRoles.includes(req.user.role)) return next();
    return next(new AppError(403, 'You are not authorized to do this action'));
};

const isAdminMiddleWare = isAuthorizedMiddleWare(['admin']);

module.exports = { protectRouteMiddleWare, isAuthorizedMiddleWare, isAdminMiddleWare };
