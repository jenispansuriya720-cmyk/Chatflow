const mongoose = require('mongoose');

mongoose
  .connect('mongodb://127.0.0.1:27017/chatflow')
  .then(() => {
    console.log('MONGO_CONNECTED_OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error('MONGO_CONNECT_ERR:', err.message);
    process.exit(1);
  });
