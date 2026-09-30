const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
  deleteAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

// Protected authenticated routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.post('/delete-account', protect, deleteAccount);

module.exports = router;
