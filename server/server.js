const env = require('./src/config/env');
const app = require('./app');
const { connectDB, disconnectDB } = require('./src/config/db');
const { syncSeedData } = require('./src/seed_data/seed');
const { releaseExpiredBookings } = require('./src/services/bookingService');

async function start() {
    await connectDB();
    // Add any missing sample products, demo accounts and sample reviews.
    // Always in development; in production only when SEED_SAMPLE_DATA=true.
    if (!env.isProd || env.SEED_SAMPLE_DATA) await syncSeedData();

    const server = app.listen(env.PORT, () => {
        console.log(`[api] server is listening on port ${env.PORT} (payments: ${env.paymentsMode})`);
    });

    // Every minute, cancel unpaid orders whose payment window has passed and return their stock.
    const sweeper = setInterval(() => {
        releaseExpiredBookings()
            .then((count) => count && console.log(`[bookings] released ${count} expired order(s)`))
            .catch((err) => console.error('[bookings] expiry job failed:', err));
    }, 60 * 1000);

    const shutdown = async (signal) => {
        console.log(`[api] ${signal} received, shutting down`);
        clearInterval(sweeper);
        server.close();
        await disconnectDB().catch(() => {});
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

start().catch((err) => {
    console.error('[api] failed to start:', err);
    process.exit(1);
});
