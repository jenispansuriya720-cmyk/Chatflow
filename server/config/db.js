const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  
  if (uri) {
    try {
      console.log(`[Database] Attempting connection to MongoDB at: ${uri}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2500, // Quick fail if local MongoDB daemon is not running
      });
      console.log(`[Database] MongoDB connected successfully to ${mongoose.connection.host}`);
      return;
    } catch (err) {
      console.warn(`[Database] Could not connect to external MongoDB: ${err.message}`);
      console.log(`[Database] Falling back to embedded in-memory MongoDB server...`);
    }
  }

  // Fallback to MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const memoryUri = mongodInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[Database] Embedded MongoDB connected successfully at ${memoryUri}`);
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
