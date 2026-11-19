const mongoose = require('mongoose');
const xss = require('xss');
const ReviewModel = require('../models/ReviewModel');
const ProductModel = require('../models/productModel');
const BookingModel = require('../models/BookingModel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { assertObjectId, toBoundedInt } = require('../utils/validators');

/** Recalculates a product's average rating from all of its reviews. */
async function updateProductRating(productId) {
    const [stats] = await ReviewModel.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await ProductModel.updateOne(
        { _id: productId },
        {
            $set: {
                averageRating: stats ? Math.round(stats.average * 10) / 10 : 0,
                ratingCount: stats ? stats.count : 0,
            },
        }
    );
}

/** POST /api/review/:productId - only customers who bought the product can review it. */
const createReviewController = catchAsync(async (req, res) => {
    const { productId } = req.params;
    assertObjectId(productId, 'product id');
    const { review, rating } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError(400, 'Rating must be from 1 to 5');
    if (typeof review !== 'string' || review.trim().length < 3) throw new AppError(400, 'Please write a short review');

    const product = await ProductModel.exists({ _id: productId });
    if (!product) throw new AppError(404, 'Product not found');

    const hasBought = await BookingModel.exists({ user: req.user._id, status: 'success', 'items.product': productId });
    if (!hasBought) throw new AppError(403, 'You can review a product after you have bought it');

    const reviewObject = await ReviewModel.create({
        // xss() escapes any HTML/script in the text before it is stored.
        review: xss(review.trim()),
        rating,
        product: productId,
        user: req.user._id,
    }).catch((err) => {
        if (err.code === 11000) throw new AppError(409, 'You have already reviewed this product');
        throw err;
    });

    await updateProductRating(productId);
    await reviewObject.populate('user', 'name');

    res.status(201).json({ status: 'success', message: 'Thanks for your review', data: reviewObject });
});

/** GET /api/review/:productId?page=1&limit=10 */
const getAllReviewForAProductController = catchAsync(async (req, res) => {
    const { productId } = req.params;
    assertObjectId(productId, 'product id');
    const page = toBoundedInt(req.query.page, 1, 1, 10000);
    const limit = toBoundedInt(req.query.limit, 10, 1, 50);

    const [reviews, total] = await Promise.all([
        ReviewModel.find({ product: productId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('user', 'name'),
        ReviewModel.countDocuments({ product: productId }),
    ]);

    res.status(200).json({
        status: 'success',
        data: reviews,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});

module.exports = { createReviewController, getAllReviewForAProductController };
