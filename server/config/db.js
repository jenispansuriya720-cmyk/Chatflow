const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  // If already connected, reuse connection (essential for Serverless/Vercel)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI;
  
  const mongooseOptions = {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  if (uri) {
    try {
      console.log(`[Database] Connecting to MongoDB...`);
      await mongoose.connect(uri, mongooseOptions);
      console.log(`[Database] MongoDB connected successfully to ${mongoose.connection.host}`);
      return mongoose.connection;
    } catch (err) {
      console.warn(`[Database] Could not connect to external MongoDB: ${err.message}`);
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        throw new Error(`MongoDB connection failed: ${err.message}. Please configure a valid MONGO_URI.`);
      }
      console.log(`[Database] Falling back to embedded in-memory MongoDB server...`);
    }
  }

  // Prevent running MongoMemoryServer in production or on Vercel
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new Error('MONGO_URI environment variable is required in production/Vercel environments.');
  }

  // Fallback to MongoMemoryServer in local development only
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const memoryUri = mongodInstance.getUri();
    await mongoose.connect(memoryUri, mongooseOptions);
    console.log(`[Database] Embedded MongoDB connected successfully at ${memoryUri}`);
    return mongoose.connection;
  } catch (error) {
    console.error('[Database] Failed to start embedded MongoDB:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
