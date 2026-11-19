const BookingModel = require('../models/BookingModel');
const { reserveStock, releaseStock } = require('./inventoryService');

/**
 * Marks a booking as paid. Safe to call more than once: both the /verify endpoint and the
 * Razorpay webhook call it, possibly at the same moment. The update only matches a booking
 * that hasn't been paid yet, so exactly one call "wins" and the rest do nothing.
 */
async function markBookingPaid(bookingId, { paymentId, signature, method, note = 'Payment received' }) {
    const now = new Date();
    const previous = await BookingModel.findOneAndUpdate(
        { _id: bookingId, status: { $in: ['pending', 'cancelled'] }, paidAt: { $exists: false } },
        {
            $set: {
                status: 'success',
                deliveryStatus: 'processing',
                paymentId,
                signature,
                paymentMethod: method,
                paidAt: now,
            },
            $unset: { expiresAt: 1, failureReason: 1 },
            $push: { history: { status: 'paid', at: now, note } },
        },
        { new: false }
    );

    // Rare case: the booking had expired (stock released) but the customer still paid.
    if (previous && !previous.stockReserved) {
        const result = await reserveStock(previous.items);
        await BookingModel.updateOne(
            { _id: bookingId },
            { $set: result.ok ? { stockReserved: true } : { needsReview: true } }
        );
    }

    return BookingModel.findById(bookingId);
}

/**
 * Cancels a booking if it is currently in one of the allowed statuses, and gives the stock back.
 * Returns null when the booking can't be cancelled.
 */
async function cancelBooking(bookingId, { fromStatuses = ['pending'], extraFilter = {}, note = '' } = {}) {
    const now = new Date();
    const previous = await BookingModel.findOneAndUpdate(
        { _id: bookingId, status: { $in: fromStatuses }, ...extraFilter },
        {
            $set: { status: 'cancelled', stockReserved: false, deliveryStatus: null },
            $unset: { expiresAt: 1 },
            $push: { history: { status: 'cancelled', at: now, note } },
        },
        { new: false }
    );
    if (!previous) return null;
    if (previous.stockReserved) await releaseStock(previous.items);
    return BookingModel.findById(bookingId);
}

/** Cancels unpaid bookings whose payment window has passed. Runs every minute from server.js. */
async function releaseExpiredBookings() {
    const expired = await BookingModel.find({ status: 'pending', expiresAt: { $lt: new Date() } }).select('_id');
    for (const booking of expired) {
        await cancelBooking(booking._id, { note: 'Payment window expired' });
    }
    return expired.length;
}

module.exports = { markBookingPaid, cancelBooking, releaseExpiredBookings };
