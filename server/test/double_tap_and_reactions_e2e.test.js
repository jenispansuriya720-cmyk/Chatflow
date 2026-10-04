require('dotenv').config();
const jwt = require('jsonwebtoken');
const ClientIO = require('socket.io-client');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { app, server } = require('../server');

const TEST_PORT = 5062;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runDoubleTapTests = async () => {
  console.log('\n============================================================');
  console.log('❤️ CHATFLOW — DOUBLE-TAP LIKES & CUSTOM REACTIONS E2E TEST');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  let serverInstance = null;
  let socketA = null;
  let socketB = null;

  try {
    await connectDB();

    serverInstance = server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Listening on port ${TEST_PORT}`);
    });

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_chatflow';

    // Create test users
    const timestamp = Date.now();
    const userA = await User.create({
      fullName: 'Alice Heart',
      username: `alice_${timestamp}`,
      email: `alice_${timestamp}@test.com`,
      password: 'password123',
    });
    const tokenA = jwt.sign({ _id: userA._id, id: userA._id }, jwtSecret, { expiresIn: '1h' });

    const userB = await User.create({
      fullName: 'Bob DoubleTap',
      username: `bob_${timestamp}`,
      email: `bob_${timestamp}@test.com`,
      password: 'password123',
    });
    const tokenB = jwt.sign({ _id: userB._id, id: userB._id }, jwtSecret, { expiresIn: '1h' });

    console.log('--- Phase 1: Socket.IO Connections & Event Listeners ---');
    socketA = ClientIO(BASE_URL, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    socketB = ClientIO(BASE_URL, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    await new Promise((resolve) => {
      let aReady = false;
      let bReady = false;
      socketA.on('connect', () => {
        assert(true, 'User A connected to Socket.IO');
        aReady = true;
        if (aReady && bReady) resolve();
      });
      socketB.on('connect', () => {
        assert(true, 'User B connected to Socket.IO');
        bReady = true;
        if (aReady && bReady) resolve();
      });
    });

    // ==========================================
    // Phase 2: Post Double-Tap to Like
    // ==========================================
    console.log('\n--- Phase 2: Post Double-Tap to Like ---');

    // Create a real post by User A
    const postRes = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        content: 'Check out this awesome photo #doubletap',
        media: [{ url: 'https://example.com/test-photo.jpg' }],
      }),
    });
    const postData = await postRes.json();
    assert(postData.success, 'User A created post successfully');
    const postId = postData.post._id;

    // Track real-time post:likeUpdated on Socket A
    let postLikeReceivedByA = null;
    socketA.on('post:likeUpdated', (payload) => {
      postLikeReceivedByA = payload;
    });

    // 1st Double-Tap by User B -> action: 'like'
    const postLike1Res = await fetch(`${BASE_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ action: 'like' }),
    });
    const postLike1 = await postLike1Res.json();
    assert(postLike1.success && postLike1.isLiked && postLike1.likesCount === 1, 'Post double-tap liked post (isLiked: true, count: 1)');

    await delay(300);
    assert(postLikeReceivedByA && postLikeReceivedByA.postId === postId.toString() && postLikeReceivedByA.likesCount === 1, 'User A received post:likeUpdated via Socket.IO');

    // 2nd Double-Tap by User B -> action: 'like' (must keep liked!)
    const postLike2Res = await fetch(`${BASE_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ action: 'like' }),
    });
    const postLike2 = await postLike2Res.json();
    assert(postLike2.success && postLike2.isLiked && postLike2.likesCount === 1, 'Double-tapping already liked post keeps liked and count remains 1');

    // Verify MongoDB directly
    const dbPost = await Post.findById(postId);
    assert(dbPost.likes.length === 1 && dbPost.likes[0].toString() === userB._id.toString(), 'MongoDB stores exactly 1 like with User B id');

    // Normal Like button tap (explicit unlike)
    const postUnlikeRes = await fetch(`${BASE_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({}),
    });
    const postUnlike = await postUnlikeRes.json();
    assert(postUnlike.success && !postUnlike.isLiked && postUnlike.likesCount === 0, 'Normal toggle explicitly unlikes post (isLiked: false, count: 0)');

    // ==========================================
    // Phase 3: Reel Double-Tap to Like
    // ==========================================
    console.log('\n--- Phase 3: Reel Double-Tap to Like ---');

    // Create a reel directly in DB
    const reel = await Reel.create({
      author: userA._id,
      video: 'https://example.com/test-reel.mp4',
      caption: 'Double tap this reel!',
      likes: [],
    });

    let reelLikeReceivedByA = null;
    socketA.on('reel:likeUpdated', (payload) => {
      reelLikeReceivedByA = payload;
    });

    // 1st Double-Tap by User B on Reel
    const reelLike1Res = await fetch(`${BASE_URL}/api/reels/${reel._id}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ action: 'like' }),
    });
    const reelLike1 = await reelLike1Res.json();
    assert(reelLike1.success && reelLike1.isLiked && reelLike1.likesCount === 1, 'Reel double-tap liked reel (isLiked: true, count: 1)');

    await delay(300);
    assert(reelLikeReceivedByA && reelLikeReceivedByA.reelId === reel._id.toString(), 'User A received reel:likeUpdated via Socket.IO');

    // 2nd Double-Tap by User B on Reel (must keep liked!)
    const reelLike2Res = await fetch(`${BASE_URL}/api/reels/${reel._id}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ action: 'like' }),
    });
    const reelLike2 = await reelLike2Res.json();
    assert(reelLike2.success && reelLike2.isLiked && reelLike2.likesCount === 1, 'Double-tapping already liked reel keeps liked and count remains 1');

    // Verify MongoDB directly
    const dbReel = await Reel.findById(reel._id);
    assert(dbReel.likes.length === 1 && dbReel.likes[0].toString() === userB._id.toString(), 'MongoDB stores exactly 1 reel like with User B id');

    // ==========================================
    // Phase 4: Chat Message Double-Tap & Custom Emojis
    // ==========================================
    console.log('\n--- Phase 4: Chat Message Double-Tap & Custom Reaction ---');

    // Create conversation
    const conversation = await Conversation.create({
      participants: [userA._id, userB._id],
      type: 'direct',
    });

    socketA.emit('joinConversation', conversation._id.toString());
    socketB.emit('joinConversation', conversation._id.toString());
    await delay(200);

    // User A sends message
    const msgRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        conversationId: conversation._id.toString(),
        text: 'Hello! Try double-tapping me.',
      }),
    });
    const msgData = await msgRes.json();
    assert(msgData.success, 'User A sent chat message');
    const msgId = msgData.message._id;

    let msgReactionReceivedByA = null;
    socketA.on('message:reactionUpdated', (payload) => {
      msgReactionReceivedByA = payload;
    });

    // 1st Double-Tap by User B on message -> action: 'ensure', emoji: '❤️'
    const react1Res = await fetch(`${BASE_URL}/api/messages/${msgId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ emoji: '❤️', action: 'ensure' }),
    });
    const react1Data = await react1Res.json();
    assert(react1Data.success && react1Data.reactions.length === 1 && react1Data.reactions[0].emoji === '❤️', 'Message double-tap reacted with ❤️');

    await delay(300);
    assert(msgReactionReceivedByA && msgReactionReceivedByA.reactions.some((r) => r.emoji === '❤️'), 'User A received real-time message:reactionUpdated event for ❤️');

    // 2nd Double-Tap by User B on message (ensure mode -> keeps ❤️, does NOT remove)
    const react2Res = await fetch(`${BASE_URL}/api/messages/${msgId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ emoji: '❤️', action: 'ensure' }),
    });
    const react2Data = await react2Res.json();
    assert(react2Data.success && react2Data.reactions.length === 1 && react2Data.reactions[0].emoji === '❤️', 'Double-tapping message again keeps ❤️ (no duplicate, not unreacted)');

    // User B opens ＋ custom emoji picker and selects '🔥'
    const reactCustomRes = await fetch(`${BASE_URL}/api/messages/${msgId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ emoji: '🔥' }),
    });
    const reactCustomData = await reactCustomRes.json();
    assert(reactCustomData.success && reactCustomData.reactions.length === 1 && reactCustomData.reactions[0].emoji === '🔥', 'Selecting custom emoji 🔥 replaced previous ❤️ (1 reaction per user)');

    // User A reacts with 🔥 as well
    const reactARes = await fetch(`${BASE_URL}/api/messages/${msgId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ emoji: '🔥' }),
    });
    const reactAData = await reactARes.json();
    assert(reactAData.success && reactAData.reactions.length === 2, 'Message now has 2 distinct user reactions for 🔥');

    // User B clicks own 🔥 reaction pill to remove it (toggle off)
    const removeBRes = await fetch(`${BASE_URL}/api/messages/${msgId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ emoji: '🔥' }),
    });
    const removeBData = await removeBRes.json();
    assert(removeBData.success && removeBData.reactions.length === 1 && removeBData.reactions[0].user._id.toString() === userA._id.toString(), 'User B removed own reaction; User A reaction persists');

    // Verify MongoDB directly
    const dbMsg = await Message.findById(msgId);
    assert(dbMsg.reactions.length === 1 && dbMsg.reactions[0].emoji === '🔥', 'MongoDB message reactions correctly persist');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (serverInstance) serverInstance.close();
    await disconnectDB();

    console.log('\n============================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
};

runDoubleTapTests();
