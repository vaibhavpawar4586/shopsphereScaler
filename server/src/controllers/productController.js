const ProductModel = require('../models/productModel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { assertObjectId, toBoundedInt, escapeRegex, isHttpUrl } = require('../utils/validators');

// All sorting, filtering and paging is done by the database, not in JavaScript.
const SORT_OPTIONS = {
    newest: { createdAt: -1 },
    price_asc: { finalPrice: 1 },
    price_desc: { finalPrice: -1 },
    rating: { averageRating: -1, ratingCount: -1 },
    name: { name: 1 },
};

function buildSearchFilter(query, baseFilter) {
    const filter = { ...baseFilter };
    const { q, category, minPrice, maxPrice } = query;

    if (typeof q === 'string' && q.trim()) {
        // Escaped so user input can't inject regex syntax.
        const pattern = new RegExp(escapeRegex(q.trim().slice(0, 80)), 'i');
        filter.$or = [{ name: pattern }, { brand: pattern }, { categories: pattern }];
    }
    if (typeof category === 'string' && category.trim()) {
        filter.categories = category.trim().toLowerCase();
    }
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (minPrice !== undefined && Number.isFinite(min)) filter.finalPrice = { ...filter.finalPrice, $gte: min };
    if (maxPrice !== undefined && Number.isFinite(max)) filter.finalPrice = { ...filter.finalPrice, $lte: max };
    return filter;
}

async function paginatedProducts(req, res, baseFilter) {
    const page = toBoundedInt(req.query.page, 1, 1, 10000);
    const limit = toBoundedInt(req.query.limit, 12, 1, 48);
    const sort = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.newest;
    const filter = buildSearchFilter(req.query, baseFilter);

    const [products, total] = await Promise.all([
        ProductModel.find(filter)
            .sort({ ...sort, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit),
        ProductModel.countDocuments(filter),
    ]);

    res.status(200).json({
        status: 'success',
        data: products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

/** GET /api/product - public catalogue (active products only). */
const getAllProductHandler = catchAsync(async (req, res) => {
    await paginatedProducts(req, res, { isActive: true });
});

/** GET /api/product/admin/all - admin/seller list, including hidden products. */
const getAllProductsForAdmin = catchAsync(async (req, res) => {
    const base = req.user.role === 'seller' ? { createdBy: req.user._id } : {};
    await paginatedProducts(req, res, base);
});

/** GET /api/product/categories */
const getProductCategories = catchAsync(async (req, res) => {
    const categories = await ProductModel.distinct('categories', { isActive: true });
    res.status(200).json({ status: 'success', data: categories.sort() });
});

/** GET /api/product/:productId */
const getProductById = catchAsync(async (req, res) => {
    const { productId } = req.params;
    assertObjectId(productId, 'product id');
    const product = await ProductModel.findOne({ _id: productId, isActive: true });
    if (!product) throw new AppError(404, 'Product not found');
    res.status(200).json({ status: 'success', data: product });
});

// Only these fields can be set from a request (mass-assignment protection).
const EDITABLE_FIELDS = ['name', 'brand', 'description', 'price', 'discount', 'categories', 'productImages', 'stock_quantity', 'isActive'];

function pickProductFields(body) {
    const data = {};
    for (const field of EDITABLE_FIELDS) {
        if (body[field] !== undefined) data[field] = body[field];
    }
    if (data.categories !== undefined) {
        if (typeof data.categories === 'string') data.categories = data.categories.split(',');
        if (!Array.isArray(data.categories) || !data.categories.every((c) => typeof c === 'string')) {
            throw new AppError(400, 'categories must be a list of names');
        }
    }
    if (data.productImages !== undefined) {
        if (!Array.isArray(data.productImages) || data.productImages.length > 8 || !data.productImages.every(isHttpUrl)) {
            throw new AppError(400, 'productImages must be a list of up to 8 http(s) image URLs');
        }
    }
    for (const field of ['price', 'discount', 'stock_quantity']) {
        if (data[field] !== undefined && (typeof data[field] !== 'number' || !Number.isFinite(data[field]))) {
            throw new AppError(400, `${field} must be a number`);
        }
    }
    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
        throw new AppError(400, 'isActive must be true or false');
    }
    return data;
}

/** POST /api/product (admin, seller) */
const createProductHandler = catchAsync(async (req, res) => {
    const data = pickProductFields(req.body);
    const product = await ProductModel.create({ ...data, createdBy: req.user._id });
    res.status(201).json({ status: 'success', message: 'Product created', data: product });
});

async function findEditableProduct(req) {
    const { productId } = req.params;
    assertObjectId(productId, 'product id');
    const product = await ProductModel.findById(productId);
    if (!product) throw new AppError(404, 'Product not found');
    // Sellers can only change their own products; admins can change any product.
    if (req.user.role === 'seller' && String(product.createdBy) !== req.user.id) {
        throw new AppError(403, 'You can only change your own products');
    }
    return product;
}

/** GET /api/product/admin/:productId (admin, seller) - includes hidden products, for the edit form. */
const getProductForAdmin = catchAsync(async (req, res) => {
    const product = await findEditableProduct(req);
    res.status(200).json({ status: 'success', data: product });
});

/** PATCH /api/product/:productId (admin, seller) */
const updateProductHandler = catchAsync(async (req, res) => {
    const product = await findEditableProduct(req);
    Object.assign(product, pickProductFields(req.body));
    await product.save(); // runs validation and recalculates finalPrice
    res.status(200).json({ status: 'success', message: 'Product updated', data: product });
});

/** DELETE /api/product/:productId (admin, seller) - soft delete, so past orders keep working. */
const deleteProductById = catchAsync(async (req, res) => {
    const product = await findEditableProduct(req);
    product.isActive = false;
    await product.save();
    res.status(200).json({ status: 'success', message: 'Product removed from the store', data: product });
});

module.exports = {
    getAllProductHandler,
    getAllProductsForAdmin,
    getProductCategories,
    getProductById,
    getProductForAdmin,
    createProductHandler,
    updateProductHandler,
    deleteProductById,
};
