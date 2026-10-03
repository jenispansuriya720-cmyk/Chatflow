const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
  deleteAccount,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getSmtpHealth,
  testSmtpEmail,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public auth & email verification endpoints
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected authenticated routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.post('/delete-account', protect, deleteAccount);

// Protected / Admin SMTP diagnostic routes
router.get('/smtp-health', getSmtpHealth);
router.post('/test-email', testSmtpEmail);

module.exports = router;
