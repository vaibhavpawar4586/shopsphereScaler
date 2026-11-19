/**
 * Seeds the database with the product catalogue and demo accounts.
 *
 *   npm run seed            -> replaces all products (keeps users and orders)
 *
 * The development server also calls seedIfEmpty() on start-up, so a new local
 * database is ready to use immediately.
 *
 * Demo accounts (change the passwords with SEED_ADMIN_PASSWORD / SEED_CUSTOMER_PASSWORD):
 *   admin@shopsphere.test     Admin@12345
 *   seller@shopsphere.test    Seller@12345
 *   customer@shopsphere.test  Customer@12345
 */
require('../config/env'); // loads .env before the demo passwords below are read
const ProductModel = require('../models/productModel');
const UserModel = require('../models/userModel');
const productsData = require('./ProductsData');

const DEMO_USERS = [
    { name: 'Store Admin', email: 'admin@shopsphere.test', role: 'admin', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' },
    { name: 'Demo Seller', email: 'seller@shopsphere.test', role: 'seller', password: process.env.SEED_SELLER_PASSWORD || 'Seller@12345' },
    { name: 'Demo Customer', email: 'customer@shopsphere.test', role: 'user', password: process.env.SEED_CUSTOMER_PASSWORD || 'Customer@12345' },
];

async function ensureDemoUsers() {
    const users = {};
    for (const demo of DEMO_USERS) {
        let user = await UserModel.findOne({ email: demo.email });
        if (!user) user = await UserModel.create(demo); // password hashed by the model
        users[demo.role] = user;
    }
    return users;
}

async function seedProducts(createdBy) {
    await ProductModel.deleteMany({});
    // create() (not insertMany) so validation and the finalPrice hook run for every product.
    for (const product of productsData) {
        await ProductModel.create({ ...product, createdBy });
    }
    return productsData.length;
}

async function seedIfEmpty() {
    const users = await ensureDemoUsers();
    if ((await ProductModel.estimatedDocumentCount()) === 0) {
        const count = await seedProducts(users.admin._id);
        console.log(`[seed] added ${count} products and demo accounts (see src/seed_data/seed.js)`);
    }
}

async function seedDatabase() {
    const users = await ensureDemoUsers();
    const count = await seedProducts(users.admin._id);
    console.log(`[seed] replaced the catalogue with ${count} products`);
}

module.exports = { seedIfEmpty, seedDatabase, DEMO_USERS };

// Run directly: node src/seed_data/seed.js
if (require.main === module) {
    // eslint-disable-next-line global-require
    const { connectDB, disconnectDB } = require('../config/db');
    connectDB()
        .then(seedDatabase)
        .then(disconnectDB)
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('[seed] failed:', err);
            process.exit(1);
        });
}
