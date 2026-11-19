const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// bcrypt cost factor: each +1 doubles the time needed to hash (and to brute force) a password.
const SALT_ROUNDS = 12;

const userSchemaRules = {
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [60, 'Name cannot be longer than 60 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false, // never returned by queries unless asked for explicitly
    },
    role: {
        type: String,
        enum: ['user', 'seller', 'admin'],
        default: 'user',
    },
    // Forgot / reset password. Only a hash of the OTP is stored.
    otpHash: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
};

const userSchema = new mongoose.Schema(userSchemaRules, { timestamps: true });

// Hash the password with bcrypt (which adds a random salt) whenever it is created or changed.
userSchema.pre('save', async function hashPassword() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove secrets whenever a user is converted to JSON for a response.
userSchema.set('toJSON', {
    transform(doc, ret) {
        delete ret.password;
        delete ret.otpHash;
        delete ret.otpExpiry;
        delete ret.otpAttempts;
        delete ret.__v;
        return ret;
    },
});

const UserModel = mongoose.model('UserModel', userSchema);
module.exports = UserModel;
