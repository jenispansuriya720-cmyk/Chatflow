const { app } = require('../server/server');
const { connectDB } = require('../server/config/db');

let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
  } catch (err) {
    console.error('[Vercel Serverless Database Connection Error]:', err.message);
  }
  return app(req, res);
};
