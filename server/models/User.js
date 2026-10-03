const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Do not return password by default
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    emailVerificationExpires: {
      type: Date,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    passwordResetExpires: {
      type: Date,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: 'Hey there! I am using ChatFlow.',
      maxlength: [200, 'Bio cannot exceed 200 characters'],
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    restrictedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mutedCreators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    hiddenWords: [
      {
        type: String,
        trim: true,
      },
    ],
    privacySettings: {
      messagePermissions: {
        type: String,
        enum: ['everyone', 'followers', 'none'],
        default: 'everyone',
      },
      storyAudience: {
        type: String,
        enum: ['everyone', 'followers'],
        default: 'everyone',
      },
      onlineStatusVisibility: {
        type: String,
        enum: ['everyone', 'followers', 'nobody'],
        default: 'everyone',
      },
      lastSeenVisibility: {
        type: String,
        enum: ['everyone', 'followers', 'nobody'],
        default: 'everyone',
      },
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    postsCount: {
      type: Number,
      default: 0,
    },
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    savedReels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reel',
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    sessions: [
      {
        sessionId: { type: String, required: true },
        browser: { type: String, default: 'Chrome' },
        os: { type: String, default: 'Windows' },
        device: { type: String, default: 'Desktop' },
        ip: { type: String, default: '127.0.0.1' },
        location: { type: String, default: 'Local Network' },
        loggedInAt: { type: Date, default: Date.now },
        lastActive: { type: Date, default: Date.now },
      },
    ],
    settings: {
      theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark',
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      sound: {
        type: Boolean,
        default: true,
      },
      readReceipts: {
        type: Boolean,
        default: true,
      },
      enterToSend: {
        type: Boolean,
        default: true,
      },
      wallpaper: {
        type: String,
        default: 'default',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
