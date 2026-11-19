const mongoose = require('mongoose');
const ReviewModel = require('../models/ReviewModel');
const ProductModel = require('../models/productModel');

/** Recalculates a product's average rating and review count from all of its reviews. */
async function updateProductRating(productId) {
    const [stats] = await ReviewModel.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
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

module.exports = { updateProductRating };
