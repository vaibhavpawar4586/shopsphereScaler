const mongoose = require('mongoose');

const reviewSchemaRules = {
    review: {
        type: String,
        required: [true, 'Review text is required'],
        trim: true,
        minlength: [3, 'Review is too short'],
        maxlength: [1000, 'Review cannot be longer than 1000 characters'],
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: [true, 'Rating is required'],
        validate: { validator: Number.isInteger, message: 'Rating must be a whole number from 1 to 5' },
    },
    user: { type: mongoose.Schema.ObjectId, ref: 'UserModel', required: true },
    product: { type: mongoose.Schema.ObjectId, ref: 'ProductModel', required: true, index: true },
};

const reviewSchema = new mongoose.Schema(reviewSchemaRules, { timestamps: true });

// One review per user per product.
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

reviewSchema.set('toJSON', {
    transform(doc, ret) {
        delete ret.__v;
        return ret;
    },
});

const ReviewModel = mongoose.model('ReviewModel', reviewSchema);
module.exports = ReviewModel;
