const crypto = require('crypto');

/**
 * Generates a 6 digit one-time password.
 * crypto.randomInt is cryptographically secure, unlike Math.random().
 */
function otpGenerator() {
    return String(crypto.randomInt(100000, 1000000));
}

/** OTPs are stored hashed, so a database leak does not expose valid codes. */
function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

module.exports = { otpGenerator, hashOtp };
