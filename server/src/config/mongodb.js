import mongoose from 'mongoose';

let isConnecting = false;
let connectionPromise = null;

export async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI environment variable');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  isConnecting = true;
  connectionPromise = mongoose
    .connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    })
    .then((connection) => {
      console.log('[MongoDB] Connected');
      return connection.connection;
    })
    .catch((error) => {
      console.error('[MongoDB] Connection failed:', error.message);
      throw error;
    })
    .finally(() => {
      isConnecting = false;
    });

  return connectionPromise;
}

export default mongoose;
