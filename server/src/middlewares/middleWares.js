const env = require('../config/env');
const AppError = require('../utils/AppError');

/** Rejects requests whose JSON body is empty (from the course's checkInput middleware). */
const checkInput = (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return next(new AppError(400, 'Request body is empty'));
    }
    return next();
};

/**
 * CSRF protection for cookie-based auth.
 * Browsers only let a page send a custom header like X-Requested-With to another site
 * after a CORS check, and our CORS allowlist only allows our own frontend.
 * So a malicious site cannot make a logged-in user's browser change data here.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const requireAjaxHeader = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (req.get('X-Requested-With') === 'XMLHttpRequest') return next();
    return next(new AppError(403, 'Missing X-Requested-With header'));
};

/** 404 for unknown routes. */
const notFoundHandler = (req, res, next) => {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/** Turns every error into a consistent { status: "failure", message } JSON response. */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || 500;
    let { message, details } = err;

    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}`;
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        details = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
        message = Object.values(details)[0] || 'Validation failed';
    } else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0];
        message = field ? `An account or record with this ${field} already exists` : 'Duplicate value';
    } else if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Malformed JSON in request body';
    } else if (err.type === 'entity.too.large') {
        statusCode = 413;
        message = 'Request body is too large';
    }

    if (statusCode >= 500) {
        console.error(err);
        if (env.isProd) message = 'Internal server error';
    }

    res.status(statusCode).json({
        status: 'failure',
        message: message || 'Something went wrong',
        ...(details && { details }),
    });
};

module.exports = { checkInput, requireAjaxHeader, notFoundHandler, errorHandler };
