const mongoose = require('mongoose');

/**
 * A booking is one order: a snapshot of the cart at checkout time,
 * the shipping address, the amounts and the Razorpay payment details.
 */

// Product details are copied in, so later price or name changes don't alter past orders.
const bookingItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.ObjectId, ref: 'ProductModel', required: true },
        name: { type: String, required: true },
        image: { type: String, default: '' },
        priceAtThatTime: { type: Number, required: true, min: 0 }, // unit price in rupees
        quantity: { type: Number, required: true, min: 1, max: 10 },
    },
    { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true, maxlength: 80 },
        phone: { type: String, required: true, trim: true },
        line1: { type: String, required: true, trim: true, maxlength: 120 },
        line2: { type: String, trim: true, maxlength: 120, default: '' },
        city: { type: String, required: true, trim: true, maxlength: 60 },
        state: { type: String, required: true, trim: true, maxlength: 60 },
        pincode: { type: String, required: true, trim: true },
        country: { type: String, default: 'India' },
    },
    { _id: false }
);

const historySchema = new mongoose.Schema(
    {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
    },
    { _id: false }
);

const bookingSchemaRules = {
    user: { type: mongoose.Schema.ObjectId, ref: 'UserModel', required: true, index: true },
    items: {
        type: [bookingItemSchema],
        validate: { validator: (items) => items.length > 0, message: 'A booking needs at least one item' },
    },
    shippingAddress: { type: shippingAddressSchema, required: true },

    // Amounts in rupees.
    itemsTotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },

    // Payment status.
    status: {
        type: String,
        enum: ['pending', 'success', 'cancelled'],
        default: 'pending',
        index: true,
    },
    // Delivery progress, set once the payment succeeds.
    deliveryStatus: {
        type: String,
        enum: ['processing', 'shipped', 'delivered', null],
        default: null,
    },

    // Razorpay details.
    paymentProvider: { type: String, enum: ['razorpay', 'mock'] },
    orderId: { type: String, index: true }, // Razorpay order id
    paymentId: { type: String },
    signature: { type: String },
    paymentMethod: { type: String },
    paidAt: { type: Date },
    failureReason: { type: String },

    // Stock is held when the booking is created and released if it is cancelled.
    stockReserved: { type: Boolean, default: false },
    // Set when something needs a person to look at it (e.g. paid after stock ran out).
    needsReview: { type: Boolean, default: false },
    // Unpaid bookings are cancelled automatically after this time.
    expiresAt: { type: Date },

    history: { type: [historySchema], default: [] },
    bookedAt: { type: Date, default: Date.now },
};

const bookingSchema = new mongoose.Schema(bookingSchemaRules, { timestamps: true });
bookingSchema.index({ status: 1, expiresAt: 1 });

bookingSchema.set('toJSON', {
    transform(doc, ret) {
        delete ret.signature;
        delete ret.__v;
        return ret;
    },
});

const BookingModel = mongoose.model('BookingModel', bookingSchema);
module.exports = BookingModel;
