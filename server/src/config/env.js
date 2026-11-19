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

// "lax" works when the frontend reaches the API through the Netlify /api proxy (same site).
// Use "none" only if the browser calls the API on a different domain directly.
const COOKIE_SAMESITE = ['lax', 'strict', 'none'].includes(process.env.COOKIE_SAMESITE) ? process.env.COOKIE_SAMESITE : 'lax';

// Number of proxies in front of the app (Render's load balancer, plus Netlify's when proxied).
// Express uses it to find the real client IP for rate limiting.
const TRUST_PROXY_HOPS = Number.parseInt(process.env.TRUST_PROXY_HOPS, 10) || 1;

module.exports = Object.freeze({
    NODE_ENV,
    isProd,
    isTest,
    PORT: Number(process.env.PORT) || 3001,
    MONGO_URI: process.env.MONGO_URI || '',
    JWT_SECRET,
    JWT_EXPIRES_IN_DAYS: 7,
    CLIENT_URLS,
    COOKIE_SAMESITE,
    TRUST_PROXY_HOPS,
    // Production only: create sample products/accounts on start-up (needs SEED_*_PASSWORD).
    SEED_SAMPLE_DATA: process.env.SEED_SAMPLE_DATA === 'true',
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    paymentsMode,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
    SENDER_EMAIL: process.env.SENDER_EMAIL || '',
    STORE_NAME: 'ShopSphere',
});
