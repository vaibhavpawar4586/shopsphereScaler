const mongoose = require('mongoose');
const AppError = require('./AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isEmail = (value) => typeof value === 'string' && value.length <= 254 && EMAIL_REGEX.test(value.trim());

const isValidObjectId = (value) => typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value);

const isHttpUrl = (value) => {
    if (typeof value !== 'string' || value.length > 500) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

/** Parses an integer query param, falling back to a default and clamping to [min, max]. */
const toBoundedInt = (value, fallback, min, max) => {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) return fallback;
    return Math.min(Math.max(number, min), max);
};

/** Escapes user input before it is used inside a RegExp (prevents ReDoS / regex injection). */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertObjectId = (value, label = 'id') => {
    if (!isValidObjectId(value)) throw new AppError(400, `Invalid ${label}`);
};

module.exports = {
    isNonEmptyString,
    isEmail,
    isValidObjectId,
    isHttpUrl,
    toBoundedInt,
    escapeRegex,
    assertObjectId,
};
