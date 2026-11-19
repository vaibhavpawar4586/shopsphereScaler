/**
 * An error with an HTTP status code. Controllers throw it and the
 * central error handler turns it into a { status: "failure", message } response.
 */
class AppError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

module.exports = AppError;
