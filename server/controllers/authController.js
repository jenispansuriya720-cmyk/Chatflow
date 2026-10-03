const crypto = require('crypto');
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
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountDeletedEmail,
  getSmtpStatus,
  verifySmtpConnection,
} = require('../services/emailService');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'chatflow_secret_key_default', {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new user & send real SMTP verification email
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

    // Generate cryptographically secure verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Default avatar if none provided
    const avatarUrl = profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    // Create user in unverified state
    const user = await User.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: phone || '',
      password,
      profilePicture: avatarUrl,
      isOnline: true,
      lastSeen: new Date(),
      emailVerified: false,
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpires: verificationExpires,
    });

    // Send REAL SMTP verification email
    try {
      await sendVerificationEmail({
        to: cleanEmail,
        name: user.fullName || user.username,
        token: rawVerificationToken,
        req,
      });
    } catch (smtpErr) {
      console.error('[Auth Register] SMTP send failure:', {
        message: smtpErr.message,
        code: smtpErr.code,
        command: smtpErr.command,
        response: smtpErr.response,
        responseCode: smtpErr.responseCode,
      });
      // Rollback created user so inconsistent state is avoided
      await User.findByIdAndDelete(user._id);
      return res.status(503).json({
        success: false,
        message: 'Unable to send the verification email right now. Please try again.',
      });
    }

    const token = generateToken(user._id);
    const userResponse = await User.findById(user._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Check your email to verify your ChatFlow account.',
      requireVerification: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email address using token
 * @route   GET /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationTokenHash');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is invalid or has expired.',
      });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      user: {
        _id: user._id,
        email: user.email,
        emailVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend email verification link
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (user && !user.emailVerified) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.emailVerificationTokenHash = tokenHash;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      try {
        await sendVerificationEmail({
          to: user.email,
          name: user.fullName || user.username,
          token: rawToken,
          req,
        });
      } catch (smtpErr) {
        console.error('[Auth Resend Verification] SMTP error:', {
          message: smtpErr.message,
          code: smtpErr.code,
          command: smtpErr.command,
          response: smtpErr.response,
          responseCode: smtpErr.responseCode,
        });
        return res.status(503).json({
          success: false,
          message: 'Unable to send the email right now. Please try again.',
        });
      }
    }

    // Generic safe response to avoid enumeration
    res.status(200).json({
      success: true,
      message: 'If an unverified account exists with that email, a verification link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password - send reset link via SMTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Enter your email address.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.fullName || user.username,
          token: rawToken,
          req,
        });
      } catch (smtpErr) {
        console.error('[Auth Forgot Password] SMTP send failed:', {
          message: smtpErr.message,
          code: smtpErr.code,
          command: smtpErr.command,
          response: smtpErr.response,
          responseCode: smtpErr.responseCode,
        });
        return res.status(503).json({
          success: false,
          message: 'Unable to send the email right now. Please try again.',
        });
      }
    }

    // Security requirement: Generic response to prevent account enumeration
    res.status(200).json({
      success: true,
      message: "If an account exists, you'll receive password reset instructions.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using secure token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required.',
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired.',
      });
    }

    // Set new password (bcrypt pre-save hook will hash it)
    user.password = newPassword;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.sessions = []; // Revoke active sessions for security
    await user.save();

    // Send real SMTP security notification
    try {
      await sendPasswordChangedEmail({
        to: user.email,
        name: user.fullName || user.username,
        timestamp: new Date().toUTCString(),
      });
    } catch (emailErr) {
      console.error('[Auth Reset Password] Security notification error:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
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
 * @desc    Change password for authenticated user & send real SMTP security alert
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

    // Send real SMTP security notification
    try {
      await sendPasswordChangedEmail({
        to: user.email,
        name: user.fullName || user.username,
        timestamp: new Date().toUTCString(),
      });
    } catch (emailErr) {
      console.error('[Auth Security] Error sending password changed notification:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Permanently delete account with password verification & send confirmation email
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

    // Capture required recipient information BEFORE deleting the user record
    const userEmail = user.email;
    const userName = user.fullName || user.username;

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

    // 8. Send real SMTP security / confirmation email
    try {
      await sendAccountDeletedEmail({
        to: userEmail,
        name: userName,
      });
    } catch (emailErr) {
      console.error('[Auth Security] Error sending account deleted email:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Your account has been deleted.',
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

/**
 * @desc    SMTP Health Check
 * @route   GET /api/auth/smtp-health
 * @access  Private / Admin
 */
const getSmtpHealth = async (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey || req.query.key;
    const isAuthorized = req.user || (adminKey && adminKey === (process.env.JWT_SECRET || ''));
    if (!isAuthorized) {
      return res.status(401).json({ success: false, message: 'Unauthorized access to SMTP health check.' });
    }

    const status = getSmtpStatus();
    const verifyResult = await verifySmtpConnection();

    res.status(200).json({
      success: true,
      smtp: status,
      connection: verifyResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test SMTP email sending (Admin diagnostic)
 * @route   POST /api/auth/test-email
 * @access  Private / Admin
 */
const testSmtpEmail = async (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey || req.query.key;
    const isAuthorized = req.user || (adminKey && adminKey === (process.env.JWT_SECRET || ''));
    if (!isAuthorized) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Admin privileges or adminKey required.' });
    }

    const { to } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid recipient email ("to").' });
    }

    const verifyResult = await verifySmtpConnection();
    if (!verifyResult.success) {
      return res.status(502).json({
        success: false,
        message: 'SMTP connection verification failed.',
        diagnostics: verifyResult,
      });
    }

    const { sendMail } = require('../services/emailService');
    const sendResult = await sendMail({
      to,
      subject: 'ChatFlow Production SMTP Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #6366f1;">ChatFlow Production SMTP Test</h2>
          <p>Congratulations! Your production SMTP mail service is connected and operating successfully.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        </div>
      `,
      text: `ChatFlow Production SMTP Test\n\nYour production SMTP mail service is connected and operational.\nTimestamp: ${new Date().toISOString()}`,
    });

    res.status(200).json({
      success: true,
      message: `Test email dispatched to ${to}`,
      result: sendResult,
    });
  } catch (error) {
    console.error('[SMTP Test Email] Failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    res.status(500).json({
      success: false,
      message: 'SMTP test email failed',
      error: {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
      },
    });
  }
};

module.exports = {
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
};
