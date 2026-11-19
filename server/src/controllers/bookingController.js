const crypto = require('crypto');
const BookingModel = require('../models/BookingModel');
const ProductModel = require('../models/productModel');
const UserModel = require('../models/userModel');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { assertObjectId, isValidObjectId, isNonEmptyString, toBoundedInt } = require('../utils/validators');
const { reserveStock, releaseStock } = require('../services/inventoryService');
const { markBookingPaid, cancelBooking } = require('../services/bookingService');
const {
    toPaise,
    createPaymentOrder,
    verifyCheckoutSignature,
    verifyWebhookSignature,
} = require('../services/paymentService');

const FREE_SHIPPING_FROM = 999; // rupees
const SHIPPING_FEE = 49; // rupees
const PAYMENT_WINDOW_MS = 30 * 60 * 1000;
const MAX_QTY_PER_ITEM = 10;

/* ------------------------------ helpers ------------------------------ */

function parseCartItems(items) {
    if (!Array.isArray(items) || items.length === 0) throw new AppError(400, 'Your cart is empty');
    if (items.length > 20) throw new AppError(400, 'Too many different items in one order (max 20)');

    // Merge duplicate lines for the same product.
    const quantities = new Map();
    for (const item of items) {
        if (!item || !isValidObjectId(item.productId)) throw new AppError(400, 'Invalid product in cart');
        if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new AppError(400, 'Invalid quantity in cart');
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    }
    for (const qty of quantities.values()) {
        if (qty > MAX_QTY_PER_ITEM) throw new AppError(400, `You can buy at most ${MAX_QTY_PER_ITEM} of each item`);
    }
    return quantities;
}

function parseShippingAddress(address) {
    if (!address || typeof address !== 'object') throw new AppError(400, 'Shipping address is required');
    const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
    const result = {
        fullName: clean(address.fullName, 80),
        phone: clean(address.phone, 15).replace(/[\s-]/g, ''),
        line1: clean(address.line1, 120),
        line2: clean(address.line2, 120),
        city: clean(address.city, 60),
        state: clean(address.state, 60),
        pincode: clean(address.pincode, 6),
        country: 'India',
    };
    for (const field of ['fullName', 'line1', 'city', 'state']) {
        if (!isNonEmptyString(result[field])) throw new AppError(400, `Shipping address: ${field} is required`);
    }
    if (!/^[6-9]\d{9}$/.test(result.phone)) throw new AppError(400, 'Please enter a valid 10 digit mobile number');
    if (!/^[1-9]\d{5}$/.test(result.pincode)) throw new AppError(400, 'Please enter a valid 6 digit pincode');
    return result;
}

/** What the browser needs to open Razorpay Checkout (or the mock payment dialog). */
function paymentDetails(booking, user) {
    return {
        mode: env.paymentsMode,
        keyId: env.paymentsMode === 'razorpay' ? env.RAZORPAY_KEY_ID : null, // the key id is public; the secret never leaves the server
        orderId: booking.orderId,
        amount: toPaise(booking.totalAmount),
        currency: booking.currency,
        name: env.STORE_NAME,
        description: `Order #${String(booking._id).slice(-8).toUpperCase()}`,
        prefill: { name: booking.shippingAddress.fullName || user.name, email: user.email, contact: booking.shippingAddress.phone },
    };
}

async function findOwnBooking(req) {
    const { bookingId } = req.params;
    assertObjectId(bookingId, 'booking id');
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new AppError(404, 'Order not found');
    if (String(booking.user) !== req.user.id && req.user.role !== 'admin') {
        // 404 rather than 403, so other people's order ids aren't confirmed to exist.
        throw new AppError(404, 'Order not found');
    }
    return booking;
}

/* ------------------------------ customer ------------------------------ */

/** POST /api/booking - create an order from the cart and start a Razorpay payment. */
const initialBookingController = catchAsync(async (req, res) => {
    const quantities = parseCartItems(req.body.items);
    const shippingAddress = parseShippingAddress(req.body.shippingAddress);

    // Prices always come from the database, never from the browser.
    const products = await ProductModel.find({ _id: { $in: [...quantities.keys()] }, isActive: true });
    if (products.length !== quantities.size) {
        throw new AppError(400, 'Some items in your cart are no longer available. Please review your cart.');
    }

    let itemsTotalPaise = 0;
    const items = products.map((product) => {
        const quantity = quantities.get(product.id);
        if (product.stock_quantity < quantity) {
            throw new AppError(409, product.stock_quantity === 0
                ? `"${product.name}" is out of stock`
                : `Only ${product.stock_quantity} left of "${product.name}"`);
        }
        itemsTotalPaise += toPaise(product.finalPrice) * quantity;
        return {
            product: product._id,
            name: product.name,
            image: product.productImages[0] || '',
            priceAtThatTime: product.finalPrice,
            quantity,
        };
    });

    const shippingPaise = itemsTotalPaise >= toPaise(FREE_SHIPPING_FROM) ? 0 : toPaise(SHIPPING_FEE);
    const totalPaise = itemsTotalPaise + shippingPaise;

    const booking = new BookingModel({
        user: req.user._id,
        items,
        shippingAddress,
        itemsTotal: itemsTotalPaise / 100,
        shippingFee: shippingPaise / 100,
        totalAmount: totalPaise / 100,
        status: 'pending',
        paymentProvider: env.paymentsMode,
        expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
        history: [{ status: 'placed', note: 'Order placed, waiting for payment' }],
    });

    // Hold the stock while the customer pays.
    const reservation = await reserveStock(items);
    if (!reservation.ok) throw new AppError(409, `"${reservation.failedItem.name}" just went out of stock`);
    booking.stockReserved = true;
    await booking.save();

    try {
        const order = await createPaymentOrder({
            amountInPaise: totalPaise,
            receipt: booking.id,
            notes: { bookingId: booking.id },
        });
        booking.orderId = order.id;
        await booking.save();
    } catch (err) {
        console.error('[payment] could not create Razorpay order:', err.error || err.message);
        await releaseStock(items);
        await booking.deleteOne();
        throw new AppError(502, 'Could not start the payment, please try again');
    }

    res.status(201).json({
        status: 'success',
        message: 'Your order has been placed',
        data: { booking, payment: paymentDetails(booking, req.user) },
    });
});

/** GET /api/booking/config - tells the frontend whether real Razorpay or mock payments are used. */
const getPaymentConfig = (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            mode: env.paymentsMode,
            keyId: env.paymentsMode === 'razorpay' ? env.RAZORPAY_KEY_ID : null,
            freeShippingFrom: FREE_SHIPPING_FROM,
            shippingFee: SHIPPING_FEE,
        },
    });
};

/** POST /api/booking/verify - checks the signature Razorpay Checkout gave the browser. */
const verifyPaymentController = catchAsync(async (req, res) => {
    const { bookingId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    assertObjectId(bookingId, 'booking id');

    const booking = await BookingModel.findOne({ _id: bookingId, user: req.user._id });
    if (!booking) throw new AppError(404, 'Order not found');
    if (booking.status === 'success') {
        return res.status(200).json({ status: 'success', message: 'Payment already confirmed', data: booking });
    }
    if (!orderId || booking.orderId !== orderId) throw new AppError(400, 'Payment does not belong to this order');
    if (!verifyCheckoutSignature({ orderId, paymentId, signature })) {
        throw new AppError(400, 'Payment verification failed');
    }

    const updated = await markBookingPaid(booking._id, { paymentId, signature, method: 'razorpay', note: 'Payment verified' });
    return res.status(200).json({ status: 'success', message: 'Payment successful', data: updated });
});

/** POST /api/booking/:bookingId/mock-pay - only in mock mode, to demo payments without Razorpay keys. */
const mockPaymentController = catchAsync(async (req, res) => {
    if (env.paymentsMode !== 'mock' || env.isProd) throw new AppError(404, 'Route not found');

    const booking = await findOwnBooking(req);
    if (booking.status !== 'pending') throw new AppError(400, 'This order is not waiting for payment');

    if (req.body.outcome === 'failure') {
        booking.failureReason = 'Payment declined (test payment)';
        booking.history.push({ status: 'payment_failed', note: booking.failureReason });
        await booking.save();
        return res.status(200).json({ status: 'success', message: 'Test payment failed', data: booking });
    }

    const paymentId = `pay_mock_${crypto.randomBytes(7).toString('hex')}`;
    const updated = await markBookingPaid(booking._id, { paymentId, method: 'mock', note: 'Test payment completed' });
    return res.status(200).json({ status: 'success', message: 'Payment successful', data: updated });
});

/**
 * POST /api/booking/webhook - called by Razorpay's servers, not the browser.
 * Mounted in app.js with express.raw() so the signature is checked against the raw body.
 */
const razorpayWebhookController = catchAsync(async (req, res) => {
    const signature = req.get('x-razorpay-signature');
    if (!verifyWebhookSignature(req.body, signature)) {
        throw new AppError(400, 'Invalid webhook signature');
    }

    let event;
    try {
        event = JSON.parse(req.body.toString('utf8'));
    } catch {
        throw new AppError(400, 'Malformed webhook body');
    }

    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    if (payment && payment.order_id) {
        const booking = await BookingModel.findOne({ orderId: payment.order_id });
        if (!booking) {
            console.warn(`[webhook] no booking for Razorpay order ${payment.order_id}`);
        } else if (event.event === 'payment.captured' || event.event === 'order.paid') {
            await markBookingPaid(booking._id, { paymentId: payment.id, method: payment.method, note: `Webhook: ${event.event}` });
            if (payment.amount !== toPaise(booking.totalAmount)) {
                await BookingModel.updateOne({ _id: booking._id }, { $set: { needsReview: true } });
            }
        } else if (event.event === 'payment.failed') {
            const reason = payment.error_description || 'Payment failed';
            await BookingModel.updateOne(
                { _id: booking._id, status: 'pending' },
                { $set: { failureReason: reason }, $push: { history: { status: 'payment_failed', note: reason } } }
            );
        }
    }

    // Always answer 200 once the signature is valid, so Razorpay doesn't keep retrying.
    res.status(200).json({ status: 'success' });
});

/** GET /api/booking/my */
const getMyBookings = catchAsync(async (req, res) => {
    const bookings = await BookingModel.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ status: 'success', data: bookings });
});

/** GET /api/booking/:bookingId */
const getBookingById = catchAsync(async (req, res) => {
    const booking = await findOwnBooking(req);
    if (req.user.role === 'admin') await booking.populate('user', 'name email');
    res.status(200).json({ status: 'success', data: booking });
});

/** GET /api/booking/:bookingId/pay - payment details to retry paying a pending order. */
const getPaymentForBooking = catchAsync(async (req, res) => {
    const booking = await findOwnBooking(req);
    if (booking.status !== 'pending') throw new AppError(400, 'This order is not waiting for payment');
    if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
        await cancelBooking(booking._id, { note: 'Payment window expired' });
        throw new AppError(410, 'The payment window for this order has expired. Please order again.');
    }
    res.status(200).json({ status: 'success', data: { booking, payment: paymentDetails(booking, req.user) } });
});

/** PATCH /api/booking/:bookingId/cancel - customer cancels an unpaid order. */
const cancelMyBooking = catchAsync(async (req, res) => {
    const booking = await findOwnBooking(req);
    const updated = await cancelBooking(booking._id, { fromStatuses: ['pending'], note: 'Cancelled by customer' });
    if (!updated) throw new AppError(400, 'Only orders that are waiting for payment can be cancelled');
    res.status(200).json({ status: 'success', message: 'Order cancelled', data: updated });
});

/* ------------------------------ admin ------------------------------ */

/** GET /api/booking - all bookings (admin). */
const getAllBookings = catchAsync(async (req, res) => {
    const page = toBoundedInt(req.query.page, 1, 1, 10000);
    const limit = toBoundedInt(req.query.limit, 20, 1, 100);
    const filter = {};
    if (['pending', 'success', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;

    const [bookings, total] = await Promise.all([
        BookingModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('user', 'name email'),
        BookingModel.countDocuments(filter),
    ]);
    res.status(200).json({
        status: 'success',
        data: bookings,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});

const NEXT_DELIVERY_STATUS = { shipped: 'processing', delivered: 'shipped' };

/** PATCH /api/booking/:bookingId/delivery { deliveryStatus: "shipped" | "delivered" } (admin) */
const updateDeliveryStatus = catchAsync(async (req, res) => {
    const { bookingId } = req.params;
    assertObjectId(bookingId, 'booking id');
    const { deliveryStatus } = req.body;
    const requiredCurrent = NEXT_DELIVERY_STATUS[deliveryStatus];
    if (!requiredCurrent) throw new AppError(400, 'deliveryStatus must be "shipped" or "delivered"');

    const updated = await BookingModel.findOneAndUpdate(
        { _id: bookingId, status: 'success', deliveryStatus: requiredCurrent },
        { $set: { deliveryStatus }, $push: { history: { status: deliveryStatus, note: `Marked ${deliveryStatus}` } } },
        { new: true }
    );
    if (!updated) throw new AppError(400, `Only paid orders that are "${requiredCurrent}" can be marked "${deliveryStatus}"`);
    res.status(200).json({ status: 'success', message: `Order marked ${deliveryStatus}`, data: updated });
});

/** PATCH /api/booking/:bookingId/admin-cancel (admin) - refunds are issued from the Razorpay dashboard. */
const adminCancelBooking = catchAsync(async (req, res) => {
    const { bookingId } = req.params;
    assertObjectId(bookingId, 'booking id');
    const updated = await cancelBooking(bookingId, {
        fromStatuses: ['pending', 'success'],
        extraFilter: { deliveryStatus: { $ne: 'delivered' } },
        note: 'Cancelled by admin',
    });
    if (!updated) throw new AppError(400, 'This order cannot be cancelled');
    const message = updated.paidAt
        ? 'Order cancelled. Issue the refund from the Razorpay dashboard.'
        : 'Order cancelled';
    res.status(200).json({ status: 'success', message, data: updated });
});

/** GET /api/booking/stats (admin) - numbers for the dashboard. */
const getBookingStats = catchAsync(async (req, res) => {
    const [revenue, totalOrders, paidOrders, pendingOrders, users, products, lowStock, recentOrders] = await Promise.all([
        BookingModel.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
        BookingModel.countDocuments(),
        BookingModel.countDocuments({ status: 'success' }),
        BookingModel.countDocuments({ status: 'pending' }),
        UserModel.countDocuments({ role: 'user' }),
        ProductModel.countDocuments({ isActive: true }),
        ProductModel.find({ isActive: true, stock_quantity: { $lt: 5 } }).select('name stock_quantity').sort({ stock_quantity: 1 }).limit(10),
        BookingModel.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
    ]);
    res.status(200).json({
        status: 'success',
        data: {
            revenue: revenue[0] ? Math.round(revenue[0].total * 100) / 100 : 0,
            totalOrders,
            paidOrders,
            pendingOrders,
            users,
            products,
            lowStock,
            recentOrders,
        },
    });
});

module.exports = {
    initialBookingController,
    getPaymentConfig,
    verifyPaymentController,
    mockPaymentController,
    razorpayWebhookController,
    getMyBookings,
    getBookingById,
    getPaymentForBooking,
    cancelMyBooking,
    getAllBookings,
    updateDeliveryStatus,
    adminCancelBooking,
    getBookingStats,
};
