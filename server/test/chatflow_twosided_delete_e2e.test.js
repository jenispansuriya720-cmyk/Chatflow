require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { io: ClientIO } = require('socket.io-client');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Reel = require('../models/Reel');
const Story = require('../models/Story');
const Media = require('../models/Media');
const AuditLog = require('../models/AuditLog');
const { app, server } = require('../server');

const TEST_PORT = 5088;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runComprehensiveE2ETest = async () => {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING CHATFLOW: TWO-SIDED CHAT & COMPLETE CONTENT DELETE SYSTEM E2E');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, detail = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${title}${detail ? ' (' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title}${detail ? ' (' + detail + ')' : ''}`);
      failed++;
    }
  };

  const req = async (path, method = 'GET', body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  };

  let socketA = null;
  let socketB = null;
  let serverInstance = null;

  try {
    // 1. Connect DB and start server
    await connectDB();
    serverInstance = server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Listening on port ${TEST_PORT}`);
    });
    await delay(800);

    const ts = Date.now();

    // 2. Register User A, B, and C
    console.log('\n--- Section 1: User Registration & Authentication ---');
    const userAData = {
      fullName: 'Alice Johnson',
      username: `alice_${ts}`,
      email: `alice_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };
    const userBData = {
      fullName: 'Bob Smith',
      username: `bob_${ts}`,
      email: `bob_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };
    const userCData = {
      fullName: 'Charlie Davis',
      username: `charlie_${ts}`,
      email: `charlie_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    const regA = await req('/api/auth/register', 'POST', userAData);
    assert(regA.status === 201 && regA.data.success, 'User A registered', regA.data?.user?.username);
    const tokenA = regA.data.token;
    const userAId = regA.data.user._id;

    const regB = await req('/api/auth/register', 'POST', userBData);
    assert(regB.status === 201 && regB.data.success, 'User B registered', regB.data?.user?.username);
    const tokenB = regB.data.token;
    const userBId = regB.data.user._id;

    const regC = await req('/api/auth/register', 'POST', userCData);
    assert(regC.status === 201 && regC.data.success, 'User C registered', regC.data?.user?.username);
    const tokenC = regC.data.token;
    const userCId = regC.data.user._id;

    // Connect Sockets for A and B
    socketA = ClientIO(BASE_URL, {
      auth: { token: tokenA, userId: userAId },
      transports: ['websocket'],
    });
    socketB = ClientIO(BASE_URL, {
      auth: { token: tokenB, userId: userBId },
      transports: ['websocket'],
    });

    await delay(600);
    assert(socketA.connected, 'Socket User A connected');
    assert(socketB.connected, 'Socket User B connected');

    // ----------------------------------------------------
    // Section 2: Two-Sided Direct Conversation Setup
    // ----------------------------------------------------
    console.log('\n--- Section 2: Two-Sided Direct Conversation & Real-Time Sync ---');
    const convRes = await req(`/api/conversations/direct/${userBId}`, 'POST', {}, tokenA);
    assert(convRes.status === 200 || convRes.status === 201, 'Direct conversation A <-> B created/retrieved');
    const convId = convRes.data.conversation._id;

    socketA.emit('joinConversation', convId);
    socketB.emit('joinConversation', convId);
    await delay(300);

    // Track real-time events on Socket B
    let socketBReceivedMessage = null;
    let socketBReceivedDelivered = null;
    let socketBReceivedRead = null;
    let socketBReceivedDeleted = null;

    socketB.on('message:new', (msg) => {
      socketBReceivedMessage = msg;
    });
    socketB.on('message:delivered', (data) => {
      socketBReceivedDelivered = data;
    });
    socketB.on('message:read', (data) => {
      socketBReceivedRead = data;
    });
    socketB.on('message:deleted', (data) => {
      socketBReceivedDeleted = data;
    });

    // User A sends message with clientMessageId
    const clientMsgId = `client_msg_${Date.now()}`;
    const sendMsgRes = await req('/api/messages', 'POST', {
      conversationId: convId,
      text: 'Hello Bob, this is Alice!',
      clientMessageId: clientMsgId,
    }, tokenA);

    assert(sendMsgRes.status === 201 && sendMsgRes.data.success, 'User A sent message successfully');
    const messageA = sendMsgRes.data.message;
    assert(messageA.sender._id.toString() === userAId.toString(), 'Message sender strictly matches User A');
    assert(messageA.clientMessageId === clientMsgId, 'Message contains clientMessageId');

    await delay(400);
    assert(socketBReceivedMessage != null && socketBReceivedMessage._id === messageA._id, 'Socket B received real-time message:new event');

    // Duplicate Prevention: User A sends duplicate message with SAME clientMessageId
    const dupSendRes = await req('/api/messages', 'POST', {
      conversationId: convId,
      text: 'Duplicate send attempt',
      clientMessageId: clientMsgId,
    }, tokenA);
    assert(dupSendRes.status === 200 && dupSendRes.data.success, 'Duplicate message request handled gracefully');
    assert(dupSendRes.data.message._id === messageA._id, 'Duplicate clientMessageId returns original message without creating copy');

    // Delivery Acknowledgment (User B receives push/delivery notification before viewing)
    const deliverRes = await req(`/api/messages/delivered/${convId}`, 'PUT', { messageIds: [messageA._id] }, tokenB);
    assert(deliverRes.status === 200, 'User B marked message as delivered');

    const checkDelivered = await req(`/api/messages/${convId}`, 'GET', null, tokenA);
    const deliveredMsg = checkDelivered.data.messages.find((m) => m._id === messageA._id);
    assert(deliveredMsg.status === 'delivered', 'Message status successfully progressed to delivered');

    // User B opens conversation (triggers read receipt & fetch)
    const messagesForB = await req(`/api/messages/${convId}`, 'GET', null, tokenB);
    assert(messagesForB.status === 200 && messagesForB.data.success, 'User B fetched conversation messages');
    const fetchedMsgB = messagesForB.data.messages.find((m) => m._id === messageA._id);
    assert(fetchedMsgB != null, 'User B finds message in conversation');
    assert(fetchedMsgB.sender._id.toString() !== userBId.toString(), 'User B correctly identifies message as INCOMING');

    const messagesForA = await req(`/api/messages/${convId}`, 'GET', null, tokenA);
    const fetchedMsgA = messagesForA.data.messages.find((m) => m._id === messageA._id);
    assert(fetchedMsgA.sender._id.toString() === userAId.toString(), 'User A correctly identifies message as OUTGOING');

    // Read Receipt verified
    const readMsg = messagesForA.data.messages.find((m) => m._id === messageA._id);
    assert(readMsg.status === 'read', 'Message status progressed to read');
    assert(readMsg.readBy.some((r) => (r.user?._id || r.user).toString() === userBId.toString()), 'User B recorded in readBy');

    // ----------------------------------------------------
    // Section 3: Message Deletion & Ownership Security
    // ----------------------------------------------------
    console.log('\n--- Section 3: Message Deletion & Ownership Enforcement ---');

    // SECURITY CHECK: User B attempts to delete User A's message for everyone -> MUST BE 403 FORBIDDEN
    const unauthorizedMsgDelete = await req(`/api/messages/${messageA._id}`, 'DELETE', { deleteType: 'for_everyone' }, tokenB);
    assert(
      unauthorizedMsgDelete.status === 403,
      'User B attempting to delete User A message for everyone returns HTTP 403 Forbidden',
      `Got status ${unauthorizedMsgDelete.status}`
    );

    // SECURITY CHECK: User C attempts to delete User A's message -> MUST BE 403 FORBIDDEN
    const unauthorizedMsgDeleteC = await req(`/api/messages/${messageA._id}`, 'DELETE', { deleteType: 'for_everyone' }, tokenC);
    assert(
      unauthorizedMsgDeleteC.status === 403,
      'Non-participant User C attempting to delete User A message returns HTTP 403 Forbidden'
    );

    // Authorized Delete: User A deletes own message for everyone
    const authorizedMsgDelete = await req(`/api/messages/${messageA._id}`, 'DELETE', { deleteType: 'for_everyone' }, tokenA);
    assert(authorizedMsgDelete.status === 200 && authorizedMsgDelete.data.success, 'User A successfully soft-deleted own message');

    await delay(300);
    assert(socketBReceivedDeleted != null && socketBReceivedDeleted.messageId === messageA._id, 'Socket B received real-time message:deleted event');

    // Verify soft-deleted state for both users
    const msgAfterDeleteA = await req(`/api/messages/${convId}`, 'GET', null, tokenA);
    const targetA = msgAfterDeleteA.data.messages.find((m) => m._id === messageA._id);
    assert(targetA.isDeleted === true, 'Message marked isDeleted: true');
    assert(targetA.text === 'This message was deleted', 'Message text replaced with canonical "This message was deleted"');

    const msgAfterDeleteB = await req(`/api/messages/${convId}`, 'GET', null, tokenB);
    const targetB = msgAfterDeleteB.data.messages.find((m) => m._id === messageA._id);
    assert(targetB.isDeleted === true && targetB.text === 'This message was deleted', 'User B sees soft-deleted text placeholder');

    // Verify Audit Log
    const auditMsg = await AuditLog.findOne({ contentId: messageA._id, action: 'soft_delete' });
    assert(auditMsg != null && auditMsg.userId.toString() === userAId.toString(), 'AuditLog created for message deletion');

    // ----------------------------------------------------
    // Section 4: Post Lifecycle, Sharing to Chat & Cascading Deletion
    // ----------------------------------------------------
    console.log('\n--- Section 4: Post Lifecycle, Sharing & Cascading Deletion ---');

    // User A creates a post
    const postRes = await req('/api/posts', 'POST', {
      content: 'Hello ChatFlow! Check out my new photo!',
      media: [{ url: '/uploads/sample_post_img.jpg', fileType: 'image' }],
    }, tokenA);
    assert(postRes.status === 201 && postRes.data.success, 'User A created a post');
    const postId = postRes.data.post._id;

    // User B comments on User A's post
    const commentRes = await req(`/api/posts/${postId}/comments`, 'POST', {
      text: 'Awesome picture Alice!',
    }, tokenB);
    assert(commentRes.status === 201 && commentRes.data.success, 'User B commented on post');
    const commentId = commentRes.data.comment._id;

    // User B saves User A's post
    const saveRes = await req(`/api/posts/${postId}/save`, 'POST', {}, tokenB);
    assert(saveRes.status === 200 && saveRes.data.success, 'User B saved post to bookmarks');

    // User A shares post to conversation A <-> B
    const shareRes = await req(`/api/posts/${postId}/share-to-chat`, 'POST', {
      conversationId: convId,
    }, tokenA);
    const sharedMessage = shareRes.data.chatMessage || shareRes.data.sharedMessage || shareRes.data.message;
    assert(sharedMessage.type === 'shared_post', 'Shared message type is shared_post');
    assert(sharedMessage.sharedContent.contentId.toString() === postId.toString(), 'sharedContent references target postId');

    // SECURITY CHECK: User B attempts to delete User A's post -> MUST BE 403 FORBIDDEN
    const unauthorizedPostDelete = await req(`/api/posts/${postId}`, 'DELETE', {}, tokenB);
    assert(
      unauthorizedPostDelete.status === 403,
      'User B attempting to delete User A post returns HTTP 403 Forbidden',
      `Got status ${unauthorizedPostDelete.status}`
    );

    // Authorized Post Delete: User A deletes own post
    const authorizedPostDelete = await req(`/api/posts/${postId}`, 'DELETE', {}, tokenA);
    assert(authorizedPostDelete.status === 200 && authorizedPostDelete.data.success, 'User A deleted own post successfully');

    // Verify Post is removed
    const checkPostDeleted = await Post.findById(postId);
    assert(checkPostDeleted === null, 'Post removed from database');

    // Verify Cascaded Comment Deletion
    const checkCommentDeleted = await Comment.findById(commentId);
    assert(checkCommentDeleted === null, 'Associated comments cascaded and deleted');

    // Verify Post removed from User B's savedPosts
    const userBUpdated = await User.findById(userBId);
    assert(!userBUpdated.savedPosts.includes(postId), 'Post removed from User B savedPosts array');

    // Verify AuditLog for Post
    const auditPost = await AuditLog.findOne({ contentId: postId, action: 'delete', contentType: 'post' });
    assert(auditPost != null && auditPost.userId.toString() === userAId.toString(), 'AuditLog created for post deletion');

    // Verify Shared Chat Message now reflects unavailable content
    const messagesWithShared = await req(`/api/messages/${convId}`, 'GET', null, tokenB);
    const targetSharedMsg = messagesWithShared.data.messages.find((m) => m._id === sharedMessage._id);
    assert(
      targetSharedMsg != null && targetSharedMsg.sharedContent?.isUnavailable === true,
      'Shared post in chat automatically flagged as unavailable after original post deleted'
    );

    // ----------------------------------------------------
    // Section 5: Reel Lifecycle & Ownership Deletion
    // ----------------------------------------------------
    console.log('\n--- Section 5: Reel Lifecycle & Ownership Deletion ---');

    const reelRes = await req('/api/reels', 'POST', {
      caption: 'Sunset vibes reel',
      videoUrl: '/uploads/sample_reel_video.mp4',
    }, tokenA);
    assert(reelRes.status === 201 && reelRes.data.success, 'User A created reel');
    const reelId = reelRes.data.reel._id;

    // SECURITY CHECK: User B attempts to delete User A reel -> MUST BE 403 FORBIDDEN
    const unauthorizedReelDelete = await req(`/api/reels/${reelId}`, 'DELETE', {}, tokenB);
    assert(
      unauthorizedReelDelete.status === 403,
      'User B attempting to delete User A reel returns HTTP 403 Forbidden'
    );

    // Authorized Reel Delete: User A deletes own reel
    const authorizedReelDelete = await req(`/api/reels/${reelId}`, 'DELETE', {}, tokenA);
    assert(authorizedReelDelete.status === 200 && authorizedReelDelete.data.success, 'User A deleted own reel successfully');

    const checkReel = await Reel.findById(reelId);
    assert(checkReel === null, 'Reel removed from database');

    const auditReel = await AuditLog.findOne({ contentId: reelId, action: 'delete', contentType: 'reel' });
    assert(auditReel != null && auditReel.userId.toString() === userAId.toString(), 'AuditLog created for reel deletion');

    // ----------------------------------------------------
    // Section 6: Story Lifecycle & Ownership Deletion
    // ----------------------------------------------------
    console.log('\n--- Section 6: Story Lifecycle & Ownership Deletion ---');

    const storyRes = await req('/api/stories', 'POST', {
      mediaUrl: '/uploads/sample_story_media.jpg',
      type: 'image',
      caption: 'Day out in nature',
    }, tokenA);
    assert(storyRes.status === 201 && storyRes.data.success, 'User A created story');
    const storyId = storyRes.data.story._id;

    // SECURITY CHECK: User B attempts to delete User A story -> MUST BE 403 FORBIDDEN
    const unauthorizedStoryDelete = await req(`/api/stories/${storyId}`, 'DELETE', {}, tokenB);
    assert(
      unauthorizedStoryDelete.status === 403,
      'User B attempting to delete User A story returns HTTP 403 Forbidden'
    );

    // Authorized Story Delete: User A deletes own story
    const authorizedStoryDelete = await req(`/api/stories/${storyId}`, 'DELETE', {}, tokenA);
    assert(authorizedStoryDelete.status === 200 && authorizedStoryDelete.data.success, 'User A deleted own story successfully');

    const checkStory = await Story.findById(storyId);
    assert(checkStory === null, 'Story removed from database');

    const auditStory = await AuditLog.findOne({ contentId: storyId, action: 'delete', contentType: 'story' });
    assert(auditStory != null && auditStory.userId.toString() === userAId.toString(), 'AuditLog created for story deletion');

    // ----------------------------------------------------
    // Section 7: Profile Picture & Cover Image Management
    // ----------------------------------------------------
    console.log('\n--- Section 7: Profile Picture & Cover Image Lifecycle ---');

    // User A sets Cover Image
    const setCoverRes = await req('/api/users/cover', 'PUT', {
      coverImage: '/uploads/my_custom_cover.jpg',
    }, tokenA);
    assert(setCoverRes.status === 200 && setCoverRes.data.success, 'User A set cover image');
    assert(setCoverRes.data.coverImage === '/uploads/my_custom_cover.jpg', 'Cover image URL set correctly');

    // User A sets Profile Picture
    const setAvatarRes = await req('/api/users/profile', 'PUT', {
      profilePicture: '/uploads/my_custom_avatar.jpg',
    }, tokenA);
    assert(setAvatarRes.status === 200 && setAvatarRes.data.success, 'User A set custom profile picture');
    assert(setAvatarRes.data.user.profilePicture === '/uploads/my_custom_avatar.jpg', 'Avatar URL set correctly');

    // User A deletes Cover Image
    const delCoverRes = await req('/api/users/cover', 'DELETE', {}, tokenA);
    assert(delCoverRes.status === 200 && delCoverRes.data.success, 'User A deleted cover image');
    assert(delCoverRes.data.coverImage === '', 'User coverImage reset to empty string');

    const auditCover = await AuditLog.findOne({ userId: userAId, action: 'delete', contentType: 'cover' });
    assert(auditCover != null, 'AuditLog created for cover image deletion');

    // User A deletes Profile Picture
    const delAvatarRes = await req('/api/users/profile-picture', 'DELETE', {}, tokenA);
    assert(delAvatarRes.status === 200 && delAvatarRes.data.success, 'User A deleted profile picture');
    assert(delAvatarRes.data.profilePicture === '', 'User profilePicture reset to empty string');

    const auditAvatar = await AuditLog.findOne({ userId: userAId, action: 'delete', contentType: 'profile_picture' });
    assert(auditAvatar != null, 'AuditLog created for profile picture deletion');

    // User B fetches User A public profile
    const userAProfile = await req(`/api/users/${userAId}`, 'GET', null, tokenB);
    assert(userAProfile.status === 200 && userAProfile.data.success, 'User B fetched User A public profile');
    assert(userAProfile.data.user.profilePicture === '', 'Public profile reflects empty profile picture (triggering fallback initials)');
    assert(userAProfile.data.user.coverImage === '', 'Public profile reflects empty cover image (triggering gradient fallback)');

    // ----------------------------------------------------
    // Section 8: Final Results Summary
    // ----------------------------------------------------
    console.log('\n========================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('Test execution encountered an unhandled exception:', err);
    failed++;
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (serverInstance) {
      serverInstance.close();
    }
    await delay(300);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runComprehensiveE2ETest();
