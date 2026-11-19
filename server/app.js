/**
 * Builds the Express application (middleware + routes).
 * server.js connects to the database and starts listening; tests import this file directly.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const env = require('./src/config/env');
const AppError = require('./src/utils/AppError');
const { apiLimiter } = require('./src/utils/rateLimiter');
const { requireAjaxHeader, notFoundHandler, errorHandler } = require('./src/middlewares/middleWares');
const { razorpayWebhookController } = require('./src/controllers/bookingController');

const AuthRouter = require('./src/routers/AuthRouter');
const UserRouter = require('./src/routers/UserRouter');
const ProductRouter = require('./src/routers/ProductRouter');
const BookingRouter = require('./src/routers/BookingRouter');
const ReviewRouter = require('./src/routers/ReviewRouter');

const app = express();

// The app runs behind proxies (Render, and Netlify when proxied); this makes req.ip the real
// client IP, which the rate limiter uses.
app.set('trust proxy', env.TRUST_PROXY_HOPS);

// Security headers (hides "X-Powered-By: Express", adds CSP, HSTS, nosniff, etc).
app.use(helmet());

// CORS: only our own frontend(s) may call the API from a browser, with cookies.
const corsConfig = {
    origin(origin, callback) {
        // Requests without an Origin header (curl, Razorpay webhooks, server-to-server) are allowed.
        if (!origin || env.CLIENT_URLS.includes(origin)) return callback(null, true);
        return callback(new AppError(403, `Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
};
app.use(cors(corsConfig));

app.get('/api/health', (req, res) => {
    // `ip` is the caller's own address as the server sees it (used to check proxy settings).
    res.status(200).json({ status: 'success', message: 'ok', payments: env.paymentsMode, ip: req.ip });
});

// Razorpay webhook: needs the raw body to verify the signature, so it is registered
// before express.json() parses (and changes) the body.
app.post('/api/booking/webhook', express.raw({ type: 'application/json', limit: '1mb' }), razorpayWebhookController);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
// Removes keys starting with "$" or containing "." from the body/query/params (NoSQL injection).
app.use(mongoSanitize());

app.use('/api', apiLimiter);
app.use('/api', requireAjaxHeader);

app.use('/api/auth', AuthRouter);
app.use('/api/user', UserRouter);
app.use('/api/product', ProductRouter);
app.use('/api/booking', BookingRouter);
app.use('/api/review', ReviewRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
