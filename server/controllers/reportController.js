const Report = require('../models/Report');

// @desc    Submit a content/user report
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, targetUser, category, details } = req.body;

    if (!targetType || !targetId || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide targetType, targetId, and category.',
      });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      targetUser: targetUser || null,
      category,
      details: details || '',
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted. Thank you for helping keep ChatFlow safe.',
      report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports submitted by authenticated user
// @route   GET /api/reports/history
// @access  Private
const getUserReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .populate('targetUser', 'fullName username profilePicture');

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getUserReports,
};
