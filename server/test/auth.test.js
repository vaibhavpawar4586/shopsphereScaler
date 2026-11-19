const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const helpers = require('./helpers');
const UserModel = require('../src/models/userModel');
const { hashOtp } = require('../src/utils/generateOtp');

const { agent, signupAgent, setupDatabase, teardownDatabase, clearDatabase } = helpers;

before(setupDatabase);
after(teardownDatabase);
beforeEach(clearDatabase);

test('signup hashes the password with bcrypt and never returns it', async () => {
    const { user } = await signupAgent({ email: 'Asha@Example.test' });
    assert.equal(user.email, 'asha@example.test');
    assert.equal(user.role, 'user');
    assert.equal(user.password, undefined);

    const stored = await UserModel.findOne({ email: 'asha@example.test' }).select('+password');
    assert.match(stored.password, /^\$2[aby]\$12\$/); // bcrypt hash, cost 12
    assert.notEqual(stored.password, 'Password@123');
});

test('signup sets an httpOnly JWT cookie', async () => {
    const res = await agent()
        .post('/api/auth/signup')
        .send({ name: 'A', email: 'a@example.test', password: 'Password@123', confirmPassword: 'Password@123' });
    assert.equal(res.status, 201);
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('JWT='));
    assert.ok(cookie, 'JWT cookie set');
    assert.match(cookie, /HttpOnly/i);
});

test('signup cannot make itself an admin', async () => {
    const res = await agent()
        .post('/api/auth/signup')
        .send({ name: 'X', email: 'x@example.test', password: 'Password@123', confirmPassword: 'Password@123', role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.role, 'user');
});

test('signup rejects mismatched passwords and duplicate emails', async () => {
    let res = await agent()
        .post('/api/auth/signup')
        .send({ name: 'A', email: 'a@example.test', password: 'Password@123', confirmPassword: 'Other@123' });
    assert.equal(res.status, 400);

    await signupAgent({ email: 'dup@example.test' });
    res = await agent()
        .post('/api/auth/signup')
        .send({ name: 'B', email: 'dup@example.test', password: 'Password@123', confirmPassword: 'Password@123' });
    assert.equal(res.status, 409);
});

test('login works with the right password and fails with the wrong one', async () => {
    await signupAgent({ email: 'b@example.test' });

    const bad = await agent().post('/api/auth/login').send({ email: 'b@example.test', password: 'wrong-password' });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.status, 'failure');

    const a = agent();
    const good = await a.post('/api/auth/login').send({ email: 'b@example.test', password: 'Password@123' });
    assert.equal(good.status, 200);
    const me = await a.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.email, 'b@example.test');
});

test('NoSQL injection in login is blocked', async () => {
    await signupAgent({ email: 'c@example.test' });
    const res = await agent().post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
});

test('protected routes need a login, and logout clears the session', async () => {
    assert.equal((await agent().get('/api/auth/me')).status, 401);

    const { agent: a } = await signupAgent({ email: 'd@example.test' });
    assert.equal((await a.get('/api/auth/me')).status, 200);
    await a.get('/api/auth/logout');
    assert.equal((await a.get('/api/auth/me')).status, 401);
});

test('state-changing requests without X-Requested-With are rejected (CSRF protection)', async () => {
    const res = await helpers.request(helpers.app)
        .post('/api/auth/login')
        .send({ email: 'a@example.test', password: 'Password@123' });
    assert.equal(res.status, 403);
});

test('forgot password never reveals the OTP and reset password works with the emailed OTP', async () => {
    await signupAgent({ email: 'e@example.test' });

    const forgot = await agent().patch('/api/auth/forgetpassword').send({ email: 'e@example.test' });
    assert.equal(forgot.status, 200);
    assert.equal(JSON.stringify(forgot.body).match(/\d{6}/), null, 'no OTP in the response');

    // Same response for an unknown email (no account enumeration).
    const unknown = await agent().patch('/api/auth/forgetpassword').send({ email: 'nobody@example.test' });
    assert.deepEqual(unknown.body, forgot.body);

    // The test can't read the email, so it sets a known OTP the same way the controller stores it.
    await UserModel.updateOne({ email: 'e@example.test' }, { otpHash: hashOtp('123456'), otpExpiry: new Date(Date.now() + 60000) });

    const wrong = await agent()
        .patch('/api/auth/resetPassword')
        .send({ email: 'e@example.test', otp: '000000', password: 'NewPass@123', confirmPassword: 'NewPass@123' });
    assert.equal(wrong.status, 400);

    const reset = await agent()
        .patch('/api/auth/resetPassword')
        .send({ email: 'e@example.test', otp: '123456', password: 'NewPass@123', confirmPassword: 'NewPass@123' });
    assert.equal(reset.status, 200);

    const login = await agent().post('/api/auth/login').send({ email: 'e@example.test', password: 'NewPass@123' });
    assert.equal(login.status, 200);

    // The OTP is single use.
    const reuse = await agent()
        .patch('/api/auth/resetPassword')
        .send({ email: 'e@example.test', otp: '123456', password: 'Other@1234', confirmPassword: 'Other@1234' });
    assert.equal(reuse.status, 400);
});

test('users list is admin only', async () => {
    const { agent: a } = await signupAgent({ email: 'f@example.test' });
    assert.equal((await a.get('/api/user')).status, 403);
    const admin = await helpers.adminAgent();
    const res = await admin.get('/api/user');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.ok(res.body.data.every((u) => u.password === undefined));
});
