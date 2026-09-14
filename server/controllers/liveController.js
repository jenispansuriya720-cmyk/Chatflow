const LiveStream = require('../models/LiveStream');
const Notification = require('../models/Notification');
const Follow = require('../models/Follow');

// @desc    Start a live stream
// @route   POST /api/live
// @access  Private
const startLive = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Stream title is required.' });
    }

    // End any previous active streams for this host
    await LiveStream.updateMany(
      { host: req.user._id, status: 'live' },
      { status: 'ended', endedAt: new Date() }
    );

    const stream = await LiveStream.create({
      host: req.user._id,
      title: title.trim(),
      description: description || '',
      status: 'live',
      viewerCount: 1,
      peakViewers: 1,
      startedAt: new Date(),
    });

    const populated = await LiveStream.findById(stream._id).populate(
      'host',
      'fullName username profilePicture bio'
    );

    // Notify followers that user is live
    const followers = await Follow.find({ following: req.user._id, status: 'accepted' });
    for (const f of followers) {
      const notif = await Notification.create({
        user: f.follower,
        sender: req.user._id,
        type: 'message',
        message: `🔴 ${req.user.fullName} is live now: "${title}"`,
      });
      if (req.io) {
        req.io.to(`user:${f.follower}`).emit('new_notification', notif);
      }
    }

    res.status(201).json({
      success: true,
      stream: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active live streams
// @route   GET /api/live
// @access  Private
const getActiveStreams = async (req, res, next) => {
  try {
    const streams = await LiveStream.find({ status: 'live' })
      .sort({ startedAt: -1 })
      .populate('host', 'fullName username profilePicture bio');

    res.status(200).json({
      success: true,
      count: streams.length,
      streams,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single stream
// @route   GET /api/live/:id
// @access  Private
const getStreamById = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id).populate(
      'host',
      'fullName username profilePicture bio'
    );

    if (!stream) {
      return res.status(404).json({ success: false, message: 'Live stream not found.' });
    }

    res.status(200).json({
      success: true,
      stream,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End a live stream
// @route   POST /api/live/:id/end
// @access  Private
const endLive = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Stream not found.' });
    }

    if (stream.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can end this live stream.',
      });
    }

    stream.status = 'ended';
    stream.endedAt = new Date();
    await stream.save();

    res.status(200).json({
      success: true,
      message: 'Live stream ended.',
      stream,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join live stream (increments viewer count)
// @route   POST /api/live/:id/join
// @access  Private
const joinLive = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream || stream.status !== 'live') {
      return res.status(404).json({ success: false, message: 'Stream not active or not found.' });
    }

    stream.viewerCount = (stream.viewerCount || 0) + 1;
    if (stream.viewerCount > stream.peakViewers) {
      stream.peakViewers = stream.viewerCount;
    }
    await stream.save();

    res.status(200).json({
      success: true,
      viewerCount: stream.viewerCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave live stream
// @route   POST /api/live/:id/leave
// @access  Private
const leaveLive = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (stream) {
      stream.viewerCount = Math.max(0, (stream.viewerCount || 1) - 1);
      await stream.save();
    }

    res.status(200).json({
      success: true,
      viewerCount: stream ? stream.viewerCount : 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startLive,
  getActiveStreams,
  getStreamById,
  endLive,
  joinLive,
  leaveLive,
};
