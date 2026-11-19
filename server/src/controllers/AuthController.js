const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { otpGenerator, hashOtp } = require('../utils/generateOtp');
const sendEmailHelper = require('../utils/dynamicMailSender');
const { isEmail, isNonEmptyString } = require('../utils/validators');

const HtmlTemplateString = fs.readFileSync(path.join(__dirname, '../templates/otp.html'), 'utf-8');

const COOKIE_NAME = 'JWT';
const COOKIE_MAX_AGE = env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
const OTP_VALID_FOR_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/**
 * httpOnly: JavaScript in the page cannot read the cookie (protects against XSS token theft).
 * secure: only sent over HTTPS in production.
 * sameSite "lax": the browser only talks to one site (Vite proxies /api in development,
 * Netlify proxies /api in production), so the cookie is first-party and not sent with
 * requests started by other websites. Browsers like Safari block cross-site cookies, which
 * is why the frontend doesn't call the Render domain directly.
 */
const cookieOptions = () => ({
    httpOnly: true,
    secure: env.isProd || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
});

function sendAuthCookie(res, user) {
    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: `${env.JWT_EXPIRES_IN_DAYS}d` });
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE });
}

function validatePassword(password, confirmPassword) {
    if (typeof password !== 'string' || password.length < 8) {
        throw new AppError(400, 'Password must be at least 8 characters');
    }
    // bcrypt only uses the first 72 bytes of a password.
    if (Buffer.byteLength(password) > 72) throw new AppError(400, 'Password is too long');
    if (password !== confirmPassword) throw new AppError(400, 'Passwords do not match');
}

const signupController = catchAsync(async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    if (!isNonEmptyString(name)) throw new AppError(400, 'Name is required');
    if (!isEmail(email)) throw new AppError(400, 'Please enter a valid email');
    validatePassword(password, confirmPassword);

    const existing = await UserModel.exists({ email: email.trim().toLowerCase() });
    if (existing) throw new AppError(409, 'An account with this email already exists');

    // Role is never taken from the request: new accounts are always "user".
    const newUser = await UserModel.create({ name: name.trim(), email, password });
    sendAuthCookie(res, newUser);

    res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        data: newUser,
    });
});

const loginController = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    if (!isEmail(email) || typeof password !== 'string' || !password) {
        throw new AppError(400, 'Email and password are required');
    }

    const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select('+password');
    // Same message whether the email or the password is wrong, so attackers can't find valid emails.
    if (!user || !(await user.comparePassword(password))) {
        throw new AppError(401, 'Email or password is incorrect');
    }

    sendAuthCookie(res, user);
    res.status(200).json({
        status: 'success',
        message: 'Logged in successfully',
        data: user,
    });
});

const logoutController = (req, res) => {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    res.status(200).json({ status: 'success', message: 'Logged out' });
};

const getMeController = (req, res) => {
    res.status(200).json({ status: 'success', data: req.user });
};

const forgetPasswordController = catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!isEmail(email)) throw new AppError(400, 'Please enter a valid email');

    // The response is the same whether or not the account exists (no account enumeration).
    const genericResponse = {
        status: 'success',
        message: 'If an account exists for this email, an OTP has been sent to it',
    };

    const user = await UserModel.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(200).json(genericResponse);

    const otp = otpGenerator();
    user.otpHash = hashOtp(otp);
    user.otpExpiry = new Date(Date.now() + OTP_VALID_FOR_MS);
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    try {
        await sendEmailHelper(otp, HtmlTemplateString, user.name, user.email);
    } catch (err) {
        console.error('[mail] failed to send OTP email:', err.message);
        throw new AppError(502, 'Could not send the OTP email, please try again later');
    }

    // The OTP is only sent by email - never in the API response.
    return res.status(200).json(genericResponse);
});

const resetPasswordController = catchAsync(async (req, res) => {
    const { email, otp, password, confirmPassword } = req.body;
    if (!isEmail(email) || !/^\d{6}$/.test(String(otp || ''))) {
        throw new AppError(400, 'Email and the 6 digit OTP are required');
    }
    validatePassword(password, confirmPassword);

    const invalid = new AppError(400, 'OTP is invalid or has expired');
    const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select('+otpHash +otpExpiry +otpAttempts');
    if (!user || !user.otpHash || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) throw invalid;

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.otpHash = undefined;
        user.otpExpiry = undefined;
        await user.save({ validateBeforeSave: false });
        throw new AppError(429, 'Too many wrong attempts, please request a new OTP');
    }

    const matches = crypto.timingSafeEqual(Buffer.from(hashOtp(otp), 'hex'), Buffer.from(user.otpHash, 'hex'));
    if (!matches) {
        user.otpAttempts += 1;
        await user.save({ validateBeforeSave: false });
        throw invalid;
    }

    user.password = password; // hashed by the pre-save hook
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.status(200).json({ status: 'success', message: 'Your password has been updated, please log in' });
});

module.exports = {
    signupController,
    loginController,
    logoutController,
    getMeController,
    forgetPasswordController,
    resetPasswordController,
};
