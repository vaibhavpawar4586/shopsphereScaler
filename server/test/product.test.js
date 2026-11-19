const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const helpers = require('./helpers');

const { agent, signupAgent, adminAgent, createProduct, setupDatabase, teardownDatabase, clearDatabase } = helpers;

before(setupDatabase);
after(teardownDatabase);
beforeEach(clearDatabase);

test('listing supports search, category filter, price sorting and pagination', async () => {
    await createProduct({ name: 'Cheap Earbuds', price: 500, discount: 0 });
    await createProduct({ name: 'Mid Speaker', price: 2000, discount: 500 });
    await createProduct({ name: 'Gold Ring', price: 9000, discount: 0, categories: ['jewelery'] });
    await createProduct({ name: 'Hidden Item', isActive: false });

    let res = await agent().get('/api/product?sort=price_asc');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.map((p) => p.name), ['Cheap Earbuds', 'Mid Speaker', 'Gold Ring']);
    assert.equal(res.body.data[1].finalPrice, 1500);

    res = await agent().get('/api/product?category=jewelery');
    assert.deepEqual(res.body.data.map((p) => p.name), ['Gold Ring']);

    res = await agent().get('/api/product?q=speak');
    assert.deepEqual(res.body.data.map((p) => p.name), ['Mid Speaker']);

    res = await agent().get('/api/product?limit=2&page=2&sort=price_asc');
    assert.deepEqual(res.body.data.map((p) => p.name), ['Gold Ring']);
    assert.equal(res.body.pagination.totalPages, 2);

    res = await agent().get('/api/product/categories');
    assert.deepEqual(res.body.data, ['electronics', 'jewelery']);
});

test('regex characters in search are treated as plain text', async () => {
    await createProduct({ name: 'Plain' });
    const res = await agent().get('/api/product?q=' + encodeURIComponent('.*'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 0);
});

test('only admins and sellers can create products', async () => {
    const product = {
        name: 'New Watch',
        brand: 'Tick',
        price: 3000,
        discount: 300,
        categories: ['electronics'],
        description: 'A smart watch for testing.',
        stock_quantity: 10,
    };

    assert.equal((await agent().post('/api/product').send(product)).status, 401);

    const { agent: customer } = await signupAgent();
    assert.equal((await customer.post('/api/product').send(product)).status, 403);

    const admin = await adminAgent();
    const res = await admin.post('/api/product').send(product);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.finalPrice, 2700);
});

test('product validation rejects a discount bigger than the price', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/product').send({
        name: 'Bad', brand: 'B', price: 100, discount: 200, categories: ['x'], description: 'Bad discount', stock_quantity: 1,
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Discount must be less/);
});

test('deleting a product hides it but keeps it in the database', async () => {
    const product = await createProduct();
    const admin = await adminAgent();
    assert.equal((await admin.delete(`/api/product/${product.id}`)).status, 200);
    assert.equal((await agent().get(`/api/product/${product.id}`)).status, 404);
    const all = await admin.get('/api/product/admin/all');
    assert.equal(all.body.data[0].isActive, false);
});

test('invalid product ids return 400, unknown ids 404', async () => {
    assert.equal((await agent().get('/api/product/not-an-id')).status, 400);
    assert.equal((await agent().get('/api/product/507f1f77bcf86cd799439011')).status, 404);
});
