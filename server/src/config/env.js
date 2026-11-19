/**
 * Central place for all environment configuration.
 * Every other file reads settings from here instead of process.env directly,
 * so missing or insecure values are caught once, at startup.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env'), quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    if (isProd) throw new Error('JWT_SECRET must be set in production');
    JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me';
    if (!isTest) console.warn('[env] JWT_SECRET is not set - using an insecure development secret.');
}

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
// Without Razorpay keys the app runs in "mock" payment mode so it can be demoed locally.
const paymentsMode = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET ? 'razorpay' : 'mock';

if (isProd) {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be set in production');
    if (paymentsMode === 'mock') throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in production');
}

const CLIENT_URLS = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

module.exports = Object.freeze({
    NODE_ENV,
    isProd,
    isTest,
    PORT: Number(process.env.PORT) || 3001,
    MONGO_URI: process.env.MONGO_URI || '',
    JWT_SECRET,
    JWT_EXPIRES_IN_DAYS: 7,
    CLIENT_URLS,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    paymentsMode,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
    SENDER_EMAIL: process.env.SENDER_EMAIL || '',
    STORE_NAME: 'ShopSphere',
});
