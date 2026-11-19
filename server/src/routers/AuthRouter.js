const express = require('express');
const { authLimiter, otpLimiter } = require('../utils/rateLimiter');
const { protectRouteMiddleWare } = require('../middlewares/authMiddleware');
const {
    signupController,
    loginController,
    logoutController,
    getMeController,
    forgetPasswordController,
    resetPasswordController,
} = require('../controllers/AuthController');

const AuthRouter = express.Router();

AuthRouter.post('/signup', authLimiter, signupController);
AuthRouter.post('/login', authLimiter, loginController);
AuthRouter.get('/logout', logoutController);
AuthRouter.get('/me', protectRouteMiddleWare, getMeController);
AuthRouter.patch('/forgetpassword', otpLimiter, forgetPasswordController);
AuthRouter.patch('/resetPassword', authLimiter, resetPasswordController);

module.exports = AuthRouter;
