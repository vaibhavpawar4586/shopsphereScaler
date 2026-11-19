const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const helpers = require('./helpers');
const ProductModel = require('../src/models/productModel');
const BookingModel = require('../src/models/BookingModel');
const { hmacSha256Hex } = require('../src/services/paymentService');
const { releaseExpiredBookings } = require('../src/services/bookingService');

const { agent, signupAgent, adminAgent, createProduct, address, setupDatabase, teardownDatabase, clearDatabase } = helpers;

before(setupDatabase);
after(teardownDatabase);
beforeEach(clearDatabase);

async function placeOrder(customer, items) {
    return customer.post('/api/booking').send({ items, shippingAddress: address });
}

function webhook(body, secret = 'test-webhook-secret') {
    const raw = JSON.stringify(body);
    return helpers.request(helpers.app)
        .post('/api/booking/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', hmacSha256Hex(secret, raw))
        .send(raw);
}

test('order total is calculated on the server from database prices', async () => {
    const product = await createProduct({ price: 1000, discount: 100 }); // sells for 900
    const { agent: customer } = await signupAgent();

    const res = await customer.post('/api/booking').send({
        items: [{ productId: product.id, quantity: 2, price: 1 }], // the "price" sent by the browser is ignored
        shippingAddress: address,
    });
    assert.equal(res.status, 201);
    const { booking, payment } = res.body.data;
    assert.equal(booking.itemsTotal, 1800);
    assert.equal(booking.shippingFee, 0); // free shipping from 999
    assert.equal(booking.totalAmount, 1800);
    assert.equal(booking.status, 'pending');
    assert.equal(payment.amount, 180000); // paise
    assert.equal(payment.mode, 'mock');
    assert.match(payment.orderId, /^order_mock_/);
});

test('shipping fee is added below the free shipping amount', async () => {
    const product = await createProduct({ price: 500, discount: 0 });
    const { agent: customer } = await signupAgent();
    const res = await placeOrder(customer, [{ productId: product.id, quantity: 1 }]);
    assert.equal(res.body.data.booking.shippingFee, 49);
    assert.equal(res.body.data.booking.totalAmount, 549);
});

test('placing an order holds stock, and cancelling gives it back', async () => {
    const product = await createProduct({ stock_quantity: 5 });
    const { agent: customer } = await signupAgent();

    const res = await placeOrder(customer, [{ productId: product.id, quantity: 3 }]);
    assert.equal((await ProductModel.findById(product.id)).stock_quantity, 2);

    const tooMany = await placeOrder(customer, [{ productId: product.id, quantity: 3 }]);
    assert.equal(tooMany.status, 409);

    const cancel = await customer.patch(`/api/booking/${res.body.data.booking._id}/cancel`);
    assert.equal(cancel.status, 200);
    assert.equal((await ProductModel.findById(product.id)).stock_quantity, 5);
});

test('expired unpaid orders are cancelled and their stock released', async () => {
    const product = await createProduct({ stock_quantity: 5 });
    const { agent: customer } = await signupAgent();
    const res = await placeOrder(customer, [{ productId: product.id, quantity: 2 }]);
    await BookingModel.updateOne({ _id: res.body.data.booking._id }, { expiresAt: new Date(Date.now() - 1000) });

    assert.equal(await releaseExpiredBookings(), 1);
    assert.equal((await BookingModel.findById(res.body.data.booking._id)).status, 'cancelled');
    assert.equal((await ProductModel.findById(product.id)).stock_quantity, 5);
});

test('mock payment marks the order paid', async () => {
    const product = await createProduct();
    const { agent: customer } = await signupAgent();
    const { booking } = (await placeOrder(customer, [{ productId: product.id, quantity: 1 }])).body.data;

    const paid = await customer.post(`/api/booking/${booking._id}/mock-pay`).send({ outcome: 'success' });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.data.status, 'success');
    assert.equal(paid.body.data.deliveryStatus, 'processing');

    const mine = await customer.get('/api/booking/my');
    assert.equal(mine.body.data.length, 1);
});

test('/verify rejects a forged Razorpay signature', async () => {
    const product = await createProduct();
    const { agent: customer } = await signupAgent();
    const { booking } = (await placeOrder(customer, [{ productId: product.id, quantity: 1 }])).body.data;

    const res = await customer.post('/api/booking/verify').send({
        bookingId: booking._id,
        razorpay_order_id: booking.orderId,
        razorpay_payment_id: 'pay_fake',
        razorpay_signature: 'forged',
    });
    assert.equal(res.status, 400);
    assert.equal((await BookingModel.findById(booking._id)).status, 'pending');
});

test('webhook with a valid signature marks the order paid, and repeats are ignored', async () => {
    const product = await createProduct({ stock_quantity: 5 });
    const { agent: customer } = await signupAgent();
    const { booking } = (await placeOrder(customer, [{ productId: product.id, quantity: 2 }])).body.data;

    const event = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123', order_id: booking.orderId, amount: 180000, method: 'upi' } } },
    };
    assert.equal((await webhook(event)).status, 200);
    assert.equal((await webhook(event)).status, 200); // Razorpay may send the same event twice

    const saved = await BookingModel.findById(booking._id);
    assert.equal(saved.status, 'success');
    assert.equal(saved.paymentId, 'pay_123');
    assert.equal(saved.history.filter((h) => h.status === 'paid').length, 1);
    assert.equal((await ProductModel.findById(product.id)).stock_quantity, 3); // stock only taken once
});

test('webhook with a wrong signature is rejected', async () => {
    const res = await webhook({ event: 'payment.captured', payload: {} }, 'wrong-secret');
    assert.equal(res.status, 400);
});

test('customers cannot see other customers\' orders', async () => {
    const product = await createProduct();
    const { agent: alice } = await signupAgent({ email: 'alice@example.test' });
    const { agent: bob } = await signupAgent({ email: 'bob@example.test' });
    const { booking } = (await placeOrder(alice, [{ productId: product.id, quantity: 1 }])).body.data;

    assert.equal((await bob.get(`/api/booking/${booking._id}`)).status, 404);
    assert.equal((await bob.get('/api/booking')).status, 403);
});

test('admin moves a paid order through shipped and delivered', async () => {
    const product = await createProduct();
    const { agent: customer } = await signupAgent();
    const { booking } = (await placeOrder(customer, [{ productId: product.id, quantity: 1 }])).body.data;
    const admin = await adminAgent();

    // Can't ship an unpaid order.
    assert.equal((await admin.patch(`/api/booking/${booking._id}/delivery`).send({ deliveryStatus: 'shipped' })).status, 400);

    await customer.post(`/api/booking/${booking._id}/mock-pay`).send({ outcome: 'success' });
    assert.equal((await admin.patch(`/api/booking/${booking._id}/delivery`).send({ deliveryStatus: 'delivered' })).status, 400);
    assert.equal((await admin.patch(`/api/booking/${booking._id}/delivery`).send({ deliveryStatus: 'shipped' })).status, 200);
    const done = await admin.patch(`/api/booking/${booking._id}/delivery`).send({ deliveryStatus: 'delivered' });
    assert.equal(done.body.data.deliveryStatus, 'delivered');

    const stats = await admin.get('/api/booking/stats');
    assert.equal(stats.body.data.paidOrders, 1);
    assert.equal(stats.body.data.revenue, 949); // 900 + 49 shipping (below free shipping)
});

test('only buyers can review, once, and the average rating is updated', async () => {
    const product = await createProduct();
    const { agent: customer } = await signupAgent();

    let res = await customer.post(`/api/review/${product.id}`).send({ review: 'Great sound', rating: 5 });
    assert.equal(res.status, 403);

    const { booking } = (await placeOrder(customer, [{ productId: product.id, quantity: 1 }])).body.data;
    await customer.post(`/api/booking/${booking._id}/mock-pay`).send({ outcome: 'success' });

    res = await customer.post(`/api/review/${product.id}`).send({ review: '<script>alert(1)</script>Great', rating: 4 });
    assert.equal(res.status, 201);
    assert.ok(!res.body.data.review.includes('<script>'), 'script tags are escaped');

    res = await customer.post(`/api/review/${product.id}`).send({ review: 'Again', rating: 1 });
    assert.equal(res.status, 409);

    const updated = await ProductModel.findById(product.id);
    assert.equal(updated.averageRating, 4);
    assert.equal(updated.ratingCount, 1);

    const list = await agent().get(`/api/review/${product.id}`);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].user.name, 'Test User');
});
