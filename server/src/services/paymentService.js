/**
 * Everything that talks to Razorpay lives here.
 *
 * Payment flow:
 *  1. Server creates a Razorpay order for the booking amount (createPaymentOrder).
 *  2. Browser opens Razorpay Checkout with that order id; the customer pays on Razorpay's page,
 *     so card/UPI details never reach our server.
 *  3. Razorpay returns razorpay_payment_id + razorpay_signature to the browser, which sends them
 *     to our /verify endpoint. We recompute the signature with our secret (verifyCheckoutSignature).
 *  4. Razorpay also calls our webhook from its servers; we check that signature too
 *     (verifyWebhookSignature). Either one can mark the booking as paid.
 *
 * Without Razorpay keys the app runs in "mock" mode: fake order ids, and payments
 * are completed through a test-only endpoint instead of Razorpay.
 */
const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require('../config/env');

let razorpayInstance = null;
function getRazorpay() {
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
    }
    return razorpayInstance;
}

const toPaise = (rupees) => Math.round(rupees * 100);

async function createPaymentOrder({ amountInPaise, receipt, notes }) {
    if (env.paymentsMode === 'mock') {
        return { id: `order_mock_${crypto.randomBytes(7).toString('hex')}`, amount: amountInPaise, currency: 'INR' };
    }
    return getRazorpay().orders.create({
        amount: amountInPaise, // smallest currency unit (paise)
        currency: 'INR',
        receipt, // our booking id, max 40 characters
        notes,
    });
}

const hmacSha256Hex = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

/** Constant-time comparison, so response timing doesn't leak how much of a signature matched. */
function safeEqual(expected, received) {
    if (typeof received !== 'string') return false;
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(received, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Checkout signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
function verifyCheckoutSignature({ orderId, paymentId, signature }) {
    if (env.paymentsMode !== 'razorpay') return false;
    if (typeof orderId !== 'string' || typeof paymentId !== 'string') return false;
    return safeEqual(hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);
}

/**
 * Webhook signature = HMAC_SHA256(raw request body, webhook secret).
 * It must be computed over the exact raw bytes Razorpay sent - re-serialising the parsed
 * JSON (JSON.stringify(req.body)) can change spacing or key order and break the check.
 */
function verifyWebhookSignature(rawBody, signature) {
    if (!env.RAZORPAY_WEBHOOK_SECRET || !Buffer.isBuffer(rawBody)) return false;
    return safeEqual(hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
}

module.exports = {
    toPaise,
    createPaymentOrder,
    verifyCheckoutSignature,
    verifyWebhookSignature,
    hmacSha256Hex,
};
