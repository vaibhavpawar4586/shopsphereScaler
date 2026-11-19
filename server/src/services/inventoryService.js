const ProductModel = require('../models/productModel');

/**
 * Takes items out of stock for a booking.
 * Each update only succeeds if enough stock is left ({ stock_quantity: { $gte: qty } }),
 * so two customers can never buy the last item at the same time.
 * If any item fails, the items already taken are put back.
 */
async function reserveStock(items) {
    const reserved = [];
    for (const item of items) {
        const result = await ProductModel.updateOne(
            { _id: item.product, stock_quantity: { $gte: item.quantity } },
            { $inc: { stock_quantity: -item.quantity } }
        );
        if (result.modifiedCount !== 1) {
            await releaseStock(reserved);
            return { ok: false, failedItem: item };
        }
        reserved.push(item);
    }
    return { ok: true };
}

/** Puts items back into stock (booking cancelled or expired). */
async function releaseStock(items) {
    await Promise.all(
        items.map((item) => ProductModel.updateOne({ _id: item.product }, { $inc: { stock_quantity: item.quantity } }))
    );
}

module.exports = { reserveStock, releaseStock };
