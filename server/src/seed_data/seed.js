/**
 * Seeds the database with the product catalogue, demo accounts and sample reviews.
 *
 *   npm run seed                 -> adds anything missing; never changes or deletes existing data
 *   npm run seed -- --reset      -> deletes ALL products and reviews first, then seeds again
 *                                   (existing orders keep their copies of product names/prices,
 *                                   but their links to the old products stop working)
 *
 * The development server runs the same "add anything missing" step on start-up,
 * so new sample products appear without wiping your local orders.
 *
 * Demo accounts. These default passwords are used in development only; in production an
 * account is created only if its SEED_ADMIN_PASSWORD / SEED_SELLER_PASSWORD /
 * SEED_CUSTOMER_PASSWORD is set:
 *   admin@shopsphere.test     Admin@12345
 *   seller@shopsphere.test    Seller@12345
 *   customer@shopsphere.test  Customer@12345
 * Three reviewer accounts (reviewer1..3@shopsphere.test) get random passwords; they only
 * exist to own the sample reviews.
 */
const env = require('../config/env'); // also loads .env before the demo passwords below are read
const crypto = require('crypto');
const ProductModel = require('../models/productModel');
const UserModel = require('../models/userModel');
const ReviewModel = require('../models/ReviewModel');
const { updateProductRating } = require('../services/ratingService');
const productsData = require('./ProductsData');
const moreProductsData = require('./MoreProductsData');

const ALL_PRODUCTS = [...productsData, ...moreProductsData];

// The default passwords are for local development only. In production an account is
// only created if its SEED_*_PASSWORD is set, so a public site never has a known admin password.
const DEMO_USERS = [
    { name: 'Store Admin', email: 'admin@shopsphere.test', role: 'admin', envPassword: 'SEED_ADMIN_PASSWORD', devPassword: 'Admin@12345' },
    { name: 'Demo Seller', email: 'seller@shopsphere.test', role: 'seller', envPassword: 'SEED_SELLER_PASSWORD', devPassword: 'Seller@12345' },
    { name: 'Demo Customer', email: 'customer@shopsphere.test', role: 'user', envPassword: 'SEED_CUSTOMER_PASSWORD', devPassword: 'Customer@12345' },
];

const REVIEWERS = [
    { name: 'Aarav S.', email: 'reviewer1@shopsphere.test' },
    { name: 'Priya N.', email: 'reviewer2@shopsphere.test' },
    { name: 'Rohan M.', email: 'reviewer3@shopsphere.test' },
];

async function findOrCreateUser(details) {
    const existing = await UserModel.findOne({ email: details.email });
    return existing || UserModel.create(details); // password hashed by the model
}

async function ensureUsers() {
    const users = {};
    for (const { envPassword, devPassword, ...demo } of DEMO_USERS) {
        const password = process.env[envPassword] || (env.isProd ? '' : devPassword);
        if (!password) {
            const existing = await UserModel.findOne({ email: demo.email });
            if (existing) users[demo.role] = existing;
            else console.warn(`[seed] ${envPassword} is not set - skipping the ${demo.email} account`);
            continue;
        }
        users[demo.role] = await findOrCreateUser({ ...demo, password });
    }
    const reviewers = [];
    for (const reviewer of REVIEWERS) {
        reviewers.push(
            await findOrCreateUser({ ...reviewer, role: 'user', password: crypto.randomBytes(24).toString('hex') })
        );
    }
    return { ...users, reviewers };
}

/** Creates products whose name isn't in the database yet. Returns how many were added. */
async function ensureProducts(createdBy) {
    const existingNames = new Set(await ProductModel.distinct('name'));
    let added = 0;
    for (const { sampleReviews, ...product } of ALL_PRODUCTS) {
        if (existingNames.has(product.name)) continue;
        // create() (not insertMany) so validation and the finalPrice hook run for every product.
        await ProductModel.create({ ...product, createdBy });
        added += 1;
    }

    // Products saved before discountPercent existed: fill it in.
    await ProductModel.updateMany({ discountPercent: { $exists: false } }, [
        {
            $set: {
                discountPercent: {
                    $cond: [{ $gt: ['$price', 0] }, { $round: [{ $multiply: [{ $divide: ['$discount', '$price'] }, 100] }, 0] }, 0],
                },
            },
        },
    ]);
    return added;
}

/** Adds the sample reviews from MoreProductsData. Existing reviews are never changed. */
async function ensureSampleReviews(reviewers) {
    const withReviews = ALL_PRODUCTS.filter((p) => p.sampleReviews && p.sampleReviews.length);
    const products = await ProductModel.find({ name: { $in: withReviews.map((p) => p.name) } }).select('_id name');
    const idByName = new Map(products.map((p) => [p.name, p._id]));

    let added = 0;
    const touched = new Set();
    for (const product of withReviews) {
        const productId = idByName.get(product.name);
        if (!productId) continue;
        for (const [index, sample] of product.sampleReviews.slice(0, reviewers.length).entries()) {
            const result = await ReviewModel.updateOne(
                { user: reviewers[index]._id, product: productId },
                { $setOnInsert: { review: sample.comment, rating: sample.rating } },
                { upsert: true }
            );
            if (result.upsertedCount) {
                added += 1;
                touched.add(String(productId));
            }
        }
    }
    for (const productId of touched) await updateProductRating(productId);
    return added;
}

/** Adds whatever is missing. Safe to run any number of times. */
async function syncSeedData() {
    const users = await ensureUsers();
    const products = await ensureProducts(users.admin && users.admin._id);
    const reviews = await ensureSampleReviews(users.reviewers);
    if (products || reviews) {
        console.log(`[seed] added ${products} product(s) and ${reviews} sample review(s) (see src/seed_data/seed.js)`);
    }
    return { products, reviews };
}

async function resetCatalogue() {
    await ReviewModel.deleteMany({});
    await ProductModel.deleteMany({});
    console.log('[seed] deleted all products and reviews');
}

module.exports = { syncSeedData, resetCatalogue, DEMO_USERS };

// Run directly: node src/seed_data/seed.js [--reset]
if (require.main === module) {
    // eslint-disable-next-line global-require
    const { connectDB, disconnectDB } = require('../config/db');
    const reset = process.argv.includes('--reset');
    connectDB()
        .then(async () => {
            if (reset) await resetCatalogue();
            const result = await syncSeedData();
            if (!result.products && !result.reviews) console.log('[seed] nothing to add - the catalogue is up to date');
        })
        .then(disconnectDB)
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('[seed] failed:', err);
            process.exit(1);
        });
}
