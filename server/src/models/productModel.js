const mongoose = require('mongoose');

const isWholeNumber = {
    validator: Number.isInteger,
    message: '{PATH} must be a whole number',
};

const productSchemaRules = {
    name: {
        type: String,
        required: [true, 'Kindly pass the name'],
        trim: true,
        maxlength: [120, 'Product name cannot be longer than 120 characters'],
    },
    brand: {
        type: String,
        required: [true, 'Please enter the brand name'],
        trim: true,
        maxlength: [60, 'Brand cannot be longer than 60 characters'],
    },
    // Price (MRP) in rupees.
    price: {
        type: Number,
        required: [true, 'Kindly pass the price'],
        min: [1, 'Price must be greater than 0'],
    },
    // Discount amount in rupees, taken off the price.
    discount: {
        type: Number,
        default: 0,
        min: [0, "Discount can't be negative"],
        validate: {
            validator(value) {
                return value < this.price;
            },
            message: 'Discount must be less than the actual price',
        },
    },
    // Selling price = price - discount, and the discount as a % of the price.
    // Stored (not calculated on the fly) so the database can sort and filter on them.
    finalPrice: { type: Number },
    discountPercent: { type: Number, default: 0 },
    categories: {
        type: [String],
        required: true,
        validate: {
            validator: (list) => Array.isArray(list) && list.length > 0,
            message: 'At least one category is required',
        },
    },
    productImages: { type: [String], default: [] },
    description: {
        type: String,
        required: [true, 'Kindly add a description'],
        maxlength: [2000, "Description can't be longer than 2000 characters"],
    },
    stock_quantity: {
        type: Number,
        required: [true, 'Stock quantity is required (at least 0)'],
        min: [0, "Stock quantity can't be negative"],
        validate: isWholeNumber,
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    // Soft delete: products stay in the database so old orders still show them.
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.ObjectId, ref: 'UserModel' },
};

const productSchema = new mongoose.Schema(productSchemaRules, { timestamps: true });

productSchema.index({ isActive: 1, categories: 1 });
productSchema.index({ isActive: 1, finalPrice: 1 });
productSchema.index({ isActive: 1, brand: 1 });

productSchema.pre('validate', function setFinalPrice() {
    const price = Number(this.price) || 0;
    const discount = Number(this.discount) || 0;
    this.finalPrice = Math.round((price - discount) * 100) / 100;
    this.discountPercent = price > 0 ? Math.round((discount / price) * 100) : 0;
    this.categories = (this.categories || []).map((c) => String(c).trim().toLowerCase()).filter(Boolean);
});

productSchema.set('toJSON', {
    transform(doc, ret) {
        delete ret.__v;
        return ret;
    },
});

const ProductModel = mongoose.model('ProductModel', productSchema);
module.exports = ProductModel;
