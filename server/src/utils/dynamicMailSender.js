const nodemailer = require('nodemailer');
const env = require('../config/env');

/**
 * Sends emails through SendGrid's SMTP server (as taught in the course).
 * If SENDGRID_API_KEY is not configured (local development), the email is
 * printed to the terminal instead so the OTP flow can still be tested.
 */
let transporter = null;
function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 465,
            secure: true,
            auth: { user: 'apikey', pass: env.SENDGRID_API_KEY },
        });
    }
    return transporter;
}

async function emailSender(to, subject, html, text) {
    if (!env.SENDGRID_API_KEY || !env.SENDER_EMAIL) {
        if (env.isProd) throw new Error('Email is not configured (SENDGRID_API_KEY / SENDER_EMAIL missing)');
        if (!env.isTest) {
            console.log(`\n[mail] Email not configured - printing instead.\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
        }
        return;
    }
    await getTransporter().sendMail({ to, from: env.SENDER_EMAIL, subject, text, html });
}

const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

async function sendEmailHelper(otp, htmlTemplate, userName, to) {
    // Fill the placeholders in the HTML template with real data.
    const finalHTMLCode = htmlTemplate
        .replace('#{USER_NAME}', escapeHtml(userName))
        .replace('#{OTP}', escapeHtml(otp));
    const text = `Hi ${userName},\nYour OTP to reset your ${env.STORE_NAME} password is ${otp}. It expires in 10 minutes.`;
    const subject = `${env.STORE_NAME} password reset OTP`;
    await emailSender(to, subject, finalHTMLCode, text);
}

module.exports = sendEmailHelper;
