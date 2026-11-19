const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('./env');

let memoryServer = null;

/**
 * Connects to MongoDB.
 * - If MONGO_URI is set (e.g. MongoDB Atlas) it is used directly.
 * - Otherwise, in development only, a local MongoDB is started with mongodb-memory-server.
 *   Its data is kept in server/.mongo-data so it survives restarts.
 */
async function connectDB(uri = env.MONGO_URI) {
    let mongoUri = uri;

    if (!mongoUri) {
        if (env.isProd) throw new Error('MONGO_URI is required in production');
        // Loaded lazily: it is a dev dependency and is never needed in production.
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const dbPath = path.join(__dirname, '../../.mongo-data');
        fs.mkdirSync(dbPath, { recursive: true });
        memoryServer = await MongoMemoryServer.create({
            instance: { dbPath, storageEngine: 'wiredTiger' },
        });
        mongoUri = memoryServer.getUri('ecommerce');
        console.log('[db] MONGO_URI not set - using a local MongoDB (data saved in server/.mongo-data)');
    }

    await mongoose.connect(mongoUri);
    console.log('[db] connected to MongoDB');
    return mongoose.connection;
}

async function disconnectDB() {
    await mongoose.disconnect();
    if (memoryServer) {
        await memoryServer.stop({ doCleanup: false });
        memoryServer = null;
    }
}

module.exports = { connectDB, disconnectDB };
