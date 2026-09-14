const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'chatflow_secret_key_default', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { fullName, username, email, phone, password, confirmPassword, profilePicture } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, username, email, and password.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Email is already registered.' });
      }
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    // Default avatar if none provided
    const avatarUrl = profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    const user = await User.create({
      fullName,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      password,
      profilePicture: avatarUrl,
      isOnline: true,
      lastSeen: new Date(),
    });

    const token = generateToken(user._id);

    const userResponse = await User.findById(user._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { loginId, password } = req.body; // loginId can be email or username

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email/username and password.',
      });
    }

    const cleanLoginId = loginId.toLowerCase().trim();

    // Query user by email or username, explicitly selecting password
    const user = await User.findOne({
      $or: [{ email: cleanLoginId }, { username: cleanLoginId }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    user.isOnline = true;
    user.lastSeen = new Date();

    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    const isMobile = /mobile/i.test(userAgent);
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    const newSession = {
      sessionId: 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      device: isMobile ? 'Mobile Device' : 'Desktop / Laptop',
      browser: userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Browser',
      os: userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : userAgent.includes('Android') ? 'Android' : userAgent.includes('iPhone') ? 'iOS' : 'Linux',
      ip,
      location: 'Local Session',
      lastActive: new Date(),
    };

    if (!user.sessions) user.sessions = [];
    user.sessions.unshift(newSession);
    if (user.sessions.length > 5) user.sessions = user.sessions.slice(0, 5);

    await user.save();

    const token = generateToken(user._id);
    const userResponse = await User.findById(user._id).select('-password');

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // In production, an email is sent. For direct usability, return resetToken in response
    res.status(200).json({
      success: true,
      message: 'Password reset link generated.',
      resetToken, // Provided for instant reset link navigation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
