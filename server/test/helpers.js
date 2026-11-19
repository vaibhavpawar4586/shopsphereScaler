/**
 * Shared test setup: an in-memory MongoDB, test environment variables and helpers.
 * Environment variables are set before app.js is loaded, so the app runs in
 * test mode with mock payments and a known webhook secret.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGO_URI = '';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.SENDGRID_API_KEY = '';
process.env.CLIENT_URL = 'http://localhost:5173';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../app');
const UserModel = require('../src/models/userModel');
const ProductModel = require('../src/models/productModel');

let mongoServer;

async function setupDatabase() {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri('ecommerce-test'));
}

async function teardownDatabase() {
    await mongoose.disconnect();
    await mongoServer.stop();
}

async function clearDatabase() {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
}

/** A supertest agent keeps cookies between requests, like a browser. */
function agent() {
    const a = request.agent(app);
    a.set('X-Requested-With', 'XMLHttpRequest');
    return a;
}

async function signupAgent({ name = 'Test User', email = 'user@example.test', password = 'Password@123' } = {}) {
    const a = agent();
    const res = await a.post('/api/auth/signup').send({ name, email, password, confirmPassword: password });
    if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
    return { agent: a, user: res.body.data };
}

async function adminAgent() {
    await UserModel.create({ name: 'Admin', email: 'admin@example.test', password: 'Admin@12345', role: 'admin' });
    const a = agent();
    const res = await a.post('/api/auth/login').send({ email: 'admin@example.test', password: 'Admin@12345' });
    if (res.status !== 200) throw new Error('admin login failed');
    return a;
}

function createProduct(overrides = {}) {
    return ProductModel.create({
        name: 'Test Headphones',
        brand: 'TestBrand',
        price: 1000,
        discount: 100,
        categories: ['electronics'],
        productImages: ['https://example.com/a.jpg'],
        description: 'Wireless headphones used in tests.',
        stock_quantity: 5,
        ...overrides,
    });
}

const address = {
    fullName: 'Test User',
    phone: '9876543210',
    line1: '12 MG Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
};

module.exports = {
    app,
    request,
    agent,
    signupAgent,
    adminAgent,
    createProduct,
    address,
    setupDatabase,
    teardownDatabase,
    clearDatabase,
};
