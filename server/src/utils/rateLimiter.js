const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

const failure = (message) => ({ status: 'failure', message });

const skipInTests = () => env.isTest;

// General limit for the whole API.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: failure('Too many requests from this IP, please try again later'),
    skip: skipInTests,
});

// Stricter limit for login and signup to slow down password guessing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: failure('Too many login attempts, please try again after 15 minutes'),
    skip: skipInTests,
});

// Very strict limit for sending OTP emails.
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: failure('Too many password reset requests, please try again after 10 minutes'),
    skip: skipInTests,
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
