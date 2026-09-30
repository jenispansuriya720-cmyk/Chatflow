const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');
const Reel = require('../models/Reel');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { cleanupMedia } = require('../utils/mediaCleanup');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'chatflow_secret_key_default', {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
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

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        return res.status(400).json({ success: false, message: 'Email is already registered.' });
      }
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    // Default avatar if none provided
    const avatarUrl = profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    const user = await User.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
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
      message: 'Account registered successfully.',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const loginIdentifier = req.body.loginId || req.body.email || req.body.username || req.body.login;
    const { password } = req.body;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email/username and password.',
      });
    }

    const cleanLoginId = loginIdentifier.toLowerCase().trim();

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

    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    const isMobile = /mobile/i.test(userAgent);
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    const currentDevice = isMobile ? 'Mobile Device' : 'Desktop / Laptop';
    const currentBrowser = userAgent.includes('Chrome')
      ? 'Chrome'
      : userAgent.includes('Firefox')
      ? 'Firefox'
      : userAgent.includes('Safari')
      ? 'Safari'
      : 'Web Browser';
    const currentOs = userAgent.includes('Windows')
      ? 'Windows'
      : userAgent.includes('Mac')
      ? 'macOS'
      : userAgent.includes('Android')
      ? 'Android'
      : userAgent.includes('iPhone')
      ? 'iOS'
      : 'Linux';

    user.isOnline = true;
    user.lastSeen = new Date();

    const newSession = {
      sessionId: 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      device: currentDevice,
      browser: currentBrowser,
      os: currentOs,
      ip,
      location: 'Local Session',
      loggedInAt: new Date(),
      lastActive: new Date(),
    };

    if (!user.sessions) {
      user.sessions = [];
    }
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

/**
 * @desc    Change password for authenticated user
 * @route   POST /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const currentUserId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findById(currentUserId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Permanently delete account with password verification
 * @route   POST /api/auth/delete-account
 * @access  Private
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Your current password is required to delete your account.',
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Deletion request rejected.',
      });
    }

    const userEmail = user.email;
    const userName = user.fullName;

    // 1. Clean up user posts and their media
    const userPosts = await Post.find({ author: userId });
    for (const p of userPosts) {
      if (p.media && p.media.length > 0) {
        for (const m of p.media) {
          if (m.url) await cleanupMedia(m.url, userId).catch(() => {});
        }
      }
    }
    await Post.deleteMany({ author: userId });

    // 2. Clean up user stories and media
    const userStories = await Story.find({ author: userId });
    for (const s of userStories) {
      if (s.media) await cleanupMedia(s.media, userId).catch(() => {});
    }
    await Story.deleteMany({ author: userId });

    // 3. Clean up user reels and media
    const userReels = await Reel.find({ author: userId });
    for (const r of userReels) {
      if (r.videoUrl) await cleanupMedia(r.videoUrl, userId).catch(() => {});
    }
    await Reel.deleteMany({ author: userId });

    // 4. Clean up comments, follows, notifications
    await Comment.deleteMany({ author: userId });
    await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
    await Notification.deleteMany({ $or: [{ user: userId }, { sender: userId }] });

    // 5. Clean up profile media
    if (user.profilePicture) await cleanupMedia(user.profilePicture, userId).catch(() => {});
    if (user.coverImage) await cleanupMedia(user.coverImage, userId).catch(() => {});

    // 6. Record audit log
    await AuditLog.create({
      userId,
      contentType: 'user',
      contentId: userId,
      action: 'delete_account',
      details: { email: userEmail, username: user.username },
    }).catch(() => {});

    // 7. Delete the user document permanently
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Your ChatFlow account and personal data have been permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
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

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
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

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
  deleteAccount,
};
