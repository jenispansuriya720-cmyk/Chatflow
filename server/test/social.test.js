require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Story = require('../models/Story');
const Reel = require('../models/Reel');
const Follow = require('../models/Follow');
const LiveStream = require('../models/LiveStream');

const runSocialTests = async () => {
  console.log('[Tests] Starting ChatFlow Social Media Test Suite...');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    await connectDB();

    // Clean test data
    await User.deleteMany({ email: /socialtest.*@chatflow\.com/ });

    // 1. Create Test Users
    const author = await User.create({
      fullName: 'Social Author',
      username: 'socialauthor',
      email: 'socialtest1@chatflow.com',
      password: 'Password123!',
    });

    const viewer = await User.create({
      fullName: 'Social Viewer',
      username: 'socialviewer',
      email: 'socialtest2@chatflow.com',
      password: 'Password123!',
    });

    assert(author._id != null && viewer._id != null, 'Test users created');

    // 2. Follow System
    const follow = await Follow.create({
      follower: viewer._id,
      following: author._id,
      status: 'accepted',
    });
    assert(follow._id != null, 'Follow relationship created');

    // 3. Post Creation & Hashtags
    const post = await Post.create({
      author: author._id,
      content: 'Testing social post with #chatflow and #react',
      hashtags: ['chatflow', 'react'],
      likes: [viewer._id],
      commentsCount: 1,
    });
    assert(post.hashtags.includes('chatflow'), 'Post created with hashtags');
    assert(post.likes.length === 1, 'Post like recorded');

    // 4. Comments
    const comment = await Comment.create({
      post: post._id,
      author: viewer._id,
      text: 'Great test post!',
    });
    assert(comment.text === 'Great test post!', 'Comment created successfully');

    // 5. 24h Story Expiration
    const story = await Story.create({
      author: author._id,
      media: 'https://example.com/test-story.jpg',
      text: 'Test story preview',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    assert(story.expiresAt > new Date(), 'Story created with valid 24h expiry');

    // 6. Reel Creation & Engagement
    const reel = await Reel.create({
      author: author._id,
      video: 'https://example.com/test-reel.mp4',
      caption: 'Test reel #coding',
      views: 150,
      likes: [viewer._id],
    });
    assert(reel.views === 150 && reel.likes.length === 1, 'Reel created with view count and like');

    // 7. Live Stream Creation
    const liveStream = await LiveStream.create({
      host: author._id,
      title: 'Testing Live Stream Broadcast',
      status: 'live',
      viewerCount: 5,
    });
    assert(liveStream.status === 'live', 'Live stream created in active status');

    // Cleanup
    await User.deleteMany({ email: /socialtest.*@chatflow\.com/ });
    await Follow.findByIdAndDelete(follow._id);
    await Post.findByIdAndDelete(post._id);
    await Comment.findByIdAndDelete(comment._id);
    await Story.findByIdAndDelete(story._id);
    await Reel.findByIdAndDelete(reel._id);
    await LiveStream.findByIdAndDelete(liveStream._id);

    console.log('---------------------------------------------------------');
    console.log(`[Social Tests Summary] Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log('---------------------------------------------------------');

    await disconnectDB();

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (error) {
    console.error('[Social Test Suite Error]:', error);
    await disconnectDB();
    process.exit(1);
  }
};

runSocialTests();
