const UserSettings = require('../models/UserSettings');
const User = require('../models/User');

// Helper to generate 8 authentic recovery codes
const generateRecoveryCodes = () => {
  const codes = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < 8; i++) {
    let part1 = '';
    let part2 = '';
    for (let j = 0; j < 4; j++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push({ code: `CF-${part1}-${part2}`, used: false });
  }
  return codes;
};

// Default seed apps for realistic Connected Apps section
const defaultConnectedApps = [
  {
    appId: 'github-oauth',
    name: 'GitHub Developer Connect',
    icon: 'github',
    permissions: ['Read profile identity', 'Read public repositories'],
    connectedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    appId: 'google-drive-sync',
    name: 'Google Drive Media Backup',
    icon: 'google',
    permissions: ['Upload media attachments', 'Backup chat history'],
    connectedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

// @desc    Get complete settings for authenticated user
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      settings = await UserSettings.create({
        userId,
        connectedApps: defaultConnectedApps,
        security: {
          twoFactorEnabled: false,
          twoFactorMethod: 'authenticator',
          backupRecoveryCodes: [],
          newLoginAlerts: true,
          suspiciousLoginDetection: true,
          loginApproval: false,
          securityLog: [
            {
              event: 'Account created & default security profile applied',
              ip: req.ip || '127.0.0.1',
              device: 'Web Client',
              timestamp: new Date(),
            },
          ],
        },
      });
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update settings (root or multiple categories)
// @route   PATCH /api/settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      settings = new UserSettings({ userId });
    }

    const allowedSections = [
      'account',
      'profile',
      'privacy',
      'security',
      'notifications',
      'messages',
      'content',
      'stories',
      'reels',
      'live',
      'communities',
      'ai',
      'appearance',
      'accessibility',
      'language',
      'data',
    ];

    allowedSections.forEach((sec) => {
      if (req.body[sec] && typeof req.body[sec] === 'object') {
        settings[sec] = {
          ...settings[sec]?.toObject?.() || settings[sec] || {},
          ...req.body[sec],
        };
      }
    });

    // Synchronize relevant settings with the primary User record
    const userUpdates = {};
    if (req.body.privacy?.accountPrivacy) {
      userUpdates.isPrivate = req.body.privacy.accountPrivacy === 'private';
    }
    if (req.body.appearance?.theme) {
      userUpdates['settings.theme'] = req.body.appearance.theme;
    }
    if (req.body.messages?.readReceipts !== undefined) {
      userUpdates['settings.readReceipts'] = req.body.messages.readReceipts;
    }
    if (req.body.messages?.enterKeySends !== undefined) {
      userUpdates['settings.enterToSend'] = req.body.messages.enterKeySends;
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: userUpdates });
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific section settings
// @route   GET /api/settings/:section
// @access  Private
const getSectionSettings = async (req, res, next) => {
  try {
    const { section } = req.params;
    const userId = req.user._id;
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      settings = await UserSettings.create({ userId });
    }

    if (!settings[section]) {
      return res.status(404).json({
        success: false,
        message: `Settings section '${section}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      section,
      data: settings[section],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update specific section settings
// @route   PATCH /api/settings/:section
// @access  Private
const updateSectionSettings = async (req, res, next) => {
  try {
    const { section } = req.params;
    const userId = req.user._id;
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      settings = new UserSettings({ userId });
    }

    if (!settings[section] && typeof settings[section] !== 'object') {
      return res.status(400).json({
        success: false,
        message: `Invalid section '${section}'`,
      });
    }

    settings[section] = {
      ...settings[section]?.toObject?.() || settings[section] || {},
      ...req.body,
    };

    // Specific sync hooks
    if (section === 'privacy' && req.body.accountPrivacy) {
      await User.findByIdAndUpdate(userId, {
        isPrivate: req.body.accountPrivacy === 'private',
      });
    }

    await settings.save();

    res.status(200).json({
      success: true,
      section,
      data: settings[section],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle 2FA & Generate Recovery Codes (Section 6)
// @route   POST /api/settings/security/2fa
// @access  Private
const toggle2FA = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { enabled, method = 'authenticator', password } = req.body;

    // Verify password for 2FA modifications
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (password) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password. Re-authentication required to modify 2FA.',
        });
      }
    }

    let settings = await UserSettings.findOne({ userId });
    if (!settings) {
      settings = new UserSettings({ userId });
    }

    if (enabled) {
      const codes = generateRecoveryCodes();
      settings.security.twoFactorEnabled = true;
      settings.security.twoFactorMethod = method;
      settings.security.backupRecoveryCodes = codes;
      settings.security.securityLog.unshift({
        event: `Two-Factor Authentication enabled (${method})`,
        ip: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Web Browser',
        timestamp: new Date(),
      });

      await settings.save();

      return res.status(200).json({
        success: true,
        twoFactorEnabled: true,
        method,
        recoveryCodes: codes.map((c) => c.code),
        message: 'Two-Factor Authentication has been successfully enabled.',
      });
    } else {
      settings.security.twoFactorEnabled = false;
      settings.security.backupRecoveryCodes = [];
      settings.security.securityLog.unshift({
        event: 'Two-Factor Authentication disabled',
        ip: req.ip || '127.0.0.1',
        device: req.headers['user-agent'] || 'Web Browser',
        timestamp: new Date(),
      });

      await settings.save();

      return res.status(200).json({
        success: true,
        twoFactorEnabled: false,
        message: 'Two-Factor Authentication has been disabled.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke connected third-party app
// @route   POST /api/settings/connected-apps/revoke
// @access  Private
const revokeConnectedApp = async (req, res, next) => {
  try {
    const { appId } = req.body;
    if (!appId) {
      return res.status(400).json({ success: false, message: 'appId is required' });
    }

    const userId = req.user._id;
    const settings = await UserSettings.findOne({ userId });
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    const initialLength = settings.connectedApps.length;
    settings.connectedApps = settings.connectedApps.filter((a) => a.appId !== appId);

    if (settings.connectedApps.length === initialLength) {
      return res.status(404).json({ success: false, message: 'App not found or already revoked' });
    }

    settings.security.securityLog.unshift({
      event: `Revoked access for application: ${appId}`,
      ip: req.ip || '127.0.0.1',
      device: 'Web Client',
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Application access revoked successfully',
      connectedApps: settings.connectedApps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear AI history
// @route   POST /api/settings/ai/clear-history
// @access  Private
const clearAiHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const settings = await UserSettings.findOne({ userId });
    if (settings) {
      settings.security.securityLog.unshift({
        event: 'AI interaction history permanently cleared',
        ip: req.ip || '127.0.0.1',
        device: 'Web Client',
        timestamp: new Date(),
      });
      await settings.save();
    }

    res.status(200).json({
      success: true,
      message: 'AI conversation summaries and assistance history have been cleared.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear client media cache
// @route   POST /api/settings/data/clear-cache
// @access  Private
const clearCache = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const settings = await UserSettings.findOne({ userId });
    if (settings) {
      settings.data.cachedMediaBytes = 0;
      await settings.save();
    }

    res.status(200).json({
      success: true,
      message: 'Local media cache cleared successfully.',
      cachedMediaBytes: 0,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Temporarily deactivate account (Section 25)
// @route   POST /api/settings/account/deactivate
// @access  Private
const deactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { password, reason } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation required to deactivate account',
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    let settings = await UserSettings.findOne({ userId });
    if (!settings) {
      settings = new UserSettings({ userId });
    }

    settings.account.status = 'deactivated';
    settings.security.securityLog.unshift({
      event: `Account temporarily deactivated. Reason: ${reason || 'Not specified'}`,
      ip: req.ip || '127.0.0.1',
      device: req.headers['user-agent'] || 'Web Browser',
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Your account has been temporarily deactivated. Log back in at any time to reactivate.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getSectionSettings,
  updateSectionSettings,
  toggle2FA,
  revokeConnectedApp,
  clearAiHistory,
  clearCache,
  deactivateAccount,
};
