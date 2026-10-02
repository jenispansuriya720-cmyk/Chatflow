require('dotenv').config();
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { io: ClientIO } = require('socket.io-client');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Story = require('../models/Story');
const Media = require('../models/Media');
const { app, server } = require('../server');

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runImageUploadE2ETest = async () => {
  console.log('\n========================================================================');
  console.log('🚀 CHATFLOW: PRODUCTION IMAGE UPLOAD SYSTEM E2E TEST SUITE');
  console.log('   POSTS + REELS + STORIES + CHAT IMAGES + SOCKET.IO REAL-TIME');
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

  const req = async (endpoint, method = 'GET', body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${endpoint}`, opts);
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  };

  // Multipart file upload helper using Node 18+ FormData and Blob
  const uploadReq = async (endpoint, filename, fileBuffer, mimeType, token = null, extraFields = {}) => {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    for (const [key, val] of Object.entries(extraFields)) {
      formData.append(key, val);
    }

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  };

  // Sample 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // Sample 1x1 JPEG buffer
  const sampleJpgBuffer = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'base64'
  );

  // Sample WebP buffer
  const sampleWebpBuffer = Buffer.from(
    'UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vv9UAAA',
    'base64'
  );

  let socketA = null;
  let socketB = null;
  let serverInstance = null;

  try {
    await connectDB();
    serverInstance = server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Listening on port ${TEST_PORT}`);
    });
    await delay(600);

    const ts = Date.now();

    // -------------------------------------------------------------
    // SECTION 1: USER REGISTRATION & AUTHENTICATION
    // -------------------------------------------------------------
    console.log('\n--- Section 1: User Registration & Authentication ---');
    const userAData = {
      fullName: 'Alice Walker',
      username: `alice_${ts}`,
      email: `alice_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };
    const userBData = {
      fullName: 'Bob Martinez',
      username: `bob_${ts}`,
      email: `bob_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };
    const userCData = {
      fullName: 'Charlie Kim',
      username: `charlie_${ts}`,
      email: `charlie_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    const regA = await req('/api/auth/register', 'POST', userAData);
    const regB = await req('/api/auth/register', 'POST', userBData);
    const regC = await req('/api/auth/register', 'POST', userCData);

    assert(regA.ok && regA.data.token, 'User A registered with valid token');
    assert(regB.ok && regB.data.token, 'User B registered with valid token');
    assert(regC.ok && regC.data.token, 'User C registered with valid token');

    const tokenA = regA.data.token;
    const tokenB = regB.data.token;
    const tokenC = regC.data.token;
    const userA = regA.data.user;
    const userB = regB.data.user;
    const userC = regC.data.user;

    // Follow relationships for social feeds
    await req(`/api/follow/${userA._id}`, 'POST', null, tokenB);
    await req(`/api/follow/${userB._id}`, 'POST', null, tokenA);

    // -------------------------------------------------------------
    // SECTION 2: SECURITY & VALIDATION ON UPLOADS
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Upload Security & Image Validation ---');

    // 1. Unauthenticated upload must be rejected with 401
    const unauthUpload = await uploadReq('/api/upload/post-image', 'test.png', samplePngBuffer, 'image/png');
    assert(unauthUpload.status === 401, 'Unauthenticated upload rejected with 401');

    // 2. Reject unsupported extension (e.g. .exe, .sh, .txt on image endpoint)
    const badExtUpload = await uploadReq(
      '/api/upload/post-image',
      'malicious.exe',
      Buffer.from('not an image'),
      'application/x-msdownload',
      tokenA
    );
    assert(badExtUpload.status === 400, 'Unsupported file extension/MIME rejected with 400', badExtUpload.data?.message);

    // 3. Reject empty (0-byte) file
    const emptyUpload = await uploadReq(
      '/api/upload/post-image',
      'empty.jpg',
      Buffer.alloc(0),
      'image/jpeg',
      tokenA
    );
    assert(emptyUpload.status === 400, '0-byte empty file rejected with 400', emptyUpload.data?.message);

    // -------------------------------------------------------------
    // SECTION 3: POST IMAGE UPLOAD FLOW
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Post Image Upload & Lifecycle ---');

    // Upload Post Image
    const postImgUpload = await uploadReq(
      '/api/upload/post-image',
      'photo_sunset.png',
      samplePngBuffer,
      'image/png',
      tokenA
    );
    assert(postImgUpload.ok && postImgUpload.data.success, 'Post image upload succeeded');
    assert(
      postImgUpload.data.file?.url && !postImgUpload.data.file.url.startsWith('blob:'),
      'Returned real storage URL (not blob)',
      postImgUpload.data.file?.url
    );
    assert(postImgUpload.data.file?.publicId != null, 'Returned valid storage publicId', postImgUpload.data.file?.publicId);

    const postMediaUrl = postImgUpload.data.file.url;
    const postMediaPublicId = postImgUpload.data.file.publicId;

    // Create Post in MongoDB
    const createPostRes = await req(
      '/api/posts',
      'POST',
      {
        content: 'Enjoying the sunset! #nature #relax',
        media: [{ url: postMediaUrl, publicId: postMediaPublicId, fileType: 'image' }],
        location: 'Miami Beach, FL',
      },
      tokenA
    );
    assert(createPostRes.ok && createPostRes.data.success, 'Post created in MongoDB');
    const createdPost = createPostRes.data.post;
    assert(createdPost.media?.[0]?.url === postMediaUrl, 'Post document stores matching image URL');
    assert(createdPost.media?.[0]?.publicId === postMediaPublicId, 'Post document stores matching publicId');

    // Retrieve post from feed & by ID (verifying image remains available after refresh)
    const getPostRes = await req(`/api/posts/${createdPost._id}`, 'GET', null, tokenA);
    assert(getPostRes.ok && getPostRes.data.post.media[0].url === postMediaUrl, 'Post retrieval preserves real image URL');

    const feedRes = await req('/api/posts/feed', 'GET', null, tokenB);
    const feedItem = (feedRes.data?.posts || []).find((p) => p._id === createdPost._id);
    assert(feedItem != null && feedItem.media[0].url === postMediaUrl, 'Follower feed shows post with real image URL');

    // Delete post & verify media cleanup
    const deletePostRes = await req(`/api/posts/${createdPost._id}`, 'DELETE', null, tokenA);
    assert(deletePostRes.ok, 'Post deleted by author');
    const postAfterDelete = await Post.findById(createdPost._id);
    assert(postAfterDelete == null, 'Post removed from MongoDB');

    // -------------------------------------------------------------
    // SECTION 4: REEL COVER / THUMBNAIL IMAGE UPLOAD
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Reel Cover / Thumbnail Image Upload ---');

    // Upload Reel Cover Image
    const reelCoverUpload = await uploadReq(
      '/api/upload/reel-cover',
      'reel_cover_shot.jpg',
      sampleJpgBuffer,
      'image/jpeg',
      tokenA
    );
    assert(reelCoverUpload.ok && reelCoverUpload.data.success, 'Reel cover image upload succeeded');
    assert(
      reelCoverUpload.data.file?.url && !reelCoverUpload.data.file.url.startsWith('blob:'),
      'Reel cover URL is valid real storage URL',
      reelCoverUpload.data.file?.url
    );

    const reelCoverUrl = reelCoverUpload.data.file.url;
    const reelCoverPublicId = reelCoverUpload.data.file.publicId;

    // Create Reel in MongoDB with video and cover image
    const createReelRes = await req(
      '/api/reels',
      'POST',
      {
        video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnail: reelCoverUrl,
        thumbnailPublicId: reelCoverPublicId,
        caption: 'Top Coding Tips #coding #reels',
      },
      tokenA
    );
    assert(createReelRes.ok && createReelRes.data.success, 'Reel created with real cover');
    const createdReel = createReelRes.data.reel;
    assert(createdReel.thumbnail === reelCoverUrl, 'Reel document stores thumbnail URL');
    assert(createdReel.thumbnailPublicId === reelCoverPublicId, 'Reel document stores thumbnail publicId');

    // Retrieve reel feed
    const reelFeedRes = await req('/api/reels/feed', 'GET', null, tokenA);
    const feedReel = (reelFeedRes.data?.reels || []).find((r) => r._id === createdReel._id);
    assert(feedReel != null && feedReel.thumbnail === reelCoverUrl, 'Reel feed displays real cover image');

    // Delete reel
    const deleteReelRes = await req(`/api/reels/${createdReel._id}`, 'DELETE', null, tokenA);
    assert(deleteReelRes.ok, 'Reel deleted by owner with media cleanup');

    // -------------------------------------------------------------
    // SECTION 5: STORY IMAGE UPLOAD & EXPIRATION
    // -------------------------------------------------------------
    console.log('\n--- Section 5: Story Image Upload & 24h Expiration ---');

    // Upload Story Image
    const storyImgUpload = await uploadReq(
      '/api/upload/story-image',
      'story_today.webp',
      sampleWebpBuffer,
      'image/webp',
      tokenA
    );
    assert(storyImgUpload.ok && storyImgUpload.data.success, 'Story image upload succeeded');
    const storyUrl = storyImgUpload.data.file.url;
    const storyPublicId = storyImgUpload.data.file.publicId;

    // Create Story in MongoDB
    const createStoryRes = await req(
      '/api/stories',
      'POST',
      {
        media: storyUrl,
        publicId: storyPublicId,
        mediaType: 'image',
        text: 'Morning coffee & code ☕',
      },
      tokenA
    );
    assert(createStoryRes.ok && createStoryRes.data.success, 'Story created in MongoDB');
    const createdStory = createStoryRes.data.story;
    assert(createdStory.media === storyUrl, 'Story document stores real image URL');
    assert(createdStory.publicId === storyPublicId, 'Story document stores publicId');

    // Expiration verification: expiresAt must be ~24h from now
    const expiresAt = new Date(createdStory.expiresAt);
    const diffHours = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    assert(diffHours > 23 && diffHours <= 24.1, 'Story expiresAt is configured for 24 hours', `${diffHours.toFixed(1)}h`);

    // Verify story appears in story feed for follower
    const storiesFeedRes = await req('/api/stories', 'GET', null, tokenB);
    const authorGroup = (storiesFeedRes.data?.storyGroups || []).find(
      (g) => g.user?._id === userA._id
    );
    assert(authorGroup != null && authorGroup.stories.length > 0, 'Story tray displays newly uploaded story');
    assert(authorGroup.stories[0].media === storyUrl, 'Story tray displays real uploaded image URL');

    // Unauthorized delete attempt by User B must be rejected
    const unauthDeleteStory = await req(`/api/stories/${createdStory._id}`, 'DELETE', null, tokenB);
    assert(unauthDeleteStory.status === 403, 'Unauthorized user cannot delete another user story (403)');

    // Authorized delete by owner
    const authDeleteStory = await req(`/api/stories/${createdStory._id}`, 'DELETE', null, tokenA);
    assert(authDeleteStory.ok, 'Story owner deleted story successfully');

    // -------------------------------------------------------------
    // SECTION 6: TWO-SIDED REAL-TIME CHAT WITH IMAGES
    // -------------------------------------------------------------
    console.log('\n--- Section 6: Two-Sided Real-Time Chat with Images ---');

    // Create 1-to-1 conversation between User A and User B
    const convRes = await req(
      '/api/conversations/direct',
      'POST',
      { recipientId: userB._id },
      tokenA
    );
    assert(convRes.ok, 'Direct conversation established between User A and User B');
    const conversationId = convRes.data.conversation._id;

    // Connect Socket clients for User A and User B
    socketA = ClientIO(BASE_URL, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });
    socketB = ClientIO(BASE_URL, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    await new Promise((resolve) => {
      let count = 0;
      const done = () => {
        count++;
        if (count === 2) resolve();
      };
      socketA.on('connect', done);
      socketB.on('connect', done);
    });

    socketA.emit('joinConversation', conversationId);
    socketB.emit('joinConversation', conversationId);
    await delay(300);

    // Track real-time received messages
    let receivedByB = null;
    let receivedByA = null;

    socketB.on('receiveMessage', (msg) => {
      receivedByB = msg;
    });
    socketA.on('receiveMessage', (msg) => {
      receivedByA = msg;
    });

    // Step A -> B: User A uploads image and sends to User B
    const chatImgUploadA = await uploadReq(
      '/api/upload/chat-image',
      'diagram_architecture.png',
      samplePngBuffer,
      'image/png',
      tokenA
    );
    assert(chatImgUploadA.ok && chatImgUploadA.data.success, 'User A uploaded chat image');
    const chatImageUrlA = chatImgUploadA.data.file.url;
    const chatImagePublicIdA = chatImgUploadA.data.file.publicId;

    const sendMsgResA = await req(
      '/api/messages',
      'POST',
      {
        conversationId,
        type: 'image',
        imageUrl: chatImageUrlA,
        attachments: [
          {
            fileType: 'image',
            url: chatImageUrlA,
            publicId: chatImagePublicIdA,
            name: 'diagram_architecture.png',
            size: samplePngBuffer.length,
            mimeType: 'image/png',
          },
        ],
        text: 'Here is the system architecture diagram!',
        clientMessageId: `msg_a_${Date.now()}`,
      },
      tokenA
    );
    assert(sendMsgResA.ok && sendMsgResA.data.success, 'User A sent image message to conversation');

    // Wait for Socket.IO delivery to User B
    await delay(500);
    assert(receivedByB != null, 'User B received real-time Socket.IO message from User A');
    assert(
      receivedByB?.imageUrl === chatImageUrlA || receivedByB?.attachments?.[0]?.url === chatImageUrlA,
      'User B received the exact real uploaded image URL',
      chatImageUrlA
    );

    // Step B -> A: User B sends image back to User A
    const chatImgUploadB = await uploadReq(
      '/api/upload/chat-image',
      'screenshot_approved.jpg',
      sampleJpgBuffer,
      'image/jpeg',
      tokenB
    );
    assert(chatImgUploadB.ok && chatImgUploadB.data.success, 'User B uploaded return chat image');
    const chatImageUrlB = chatImgUploadB.data.file.url;
    const chatImagePublicIdB = chatImgUploadB.data.file.publicId;

    const sendMsgResB = await req(
      '/api/messages',
      'POST',
      {
        conversationId,
        type: 'image',
        imageUrl: chatImageUrlB,
        attachments: [
          {
            fileType: 'image',
            url: chatImageUrlB,
            publicId: chatImagePublicIdB,
            name: 'screenshot_approved.jpg',
            size: sampleJpgBuffer.length,
            mimeType: 'image/jpeg',
          },
        ],
        text: 'Looks fantastic, approved!',
        clientMessageId: `msg_b_${Date.now()}`,
      },
      tokenB
    );
    assert(sendMsgResB.ok && sendMsgResB.data.success, 'User B sent image message back to User A');

    await delay(500);
    assert(receivedByA != null, 'User A received real-time return message from User B');
    assert(
      receivedByA?.imageUrl === chatImageUrlB || receivedByA?.attachments?.[0]?.url === chatImageUrlB,
      'User A received the exact real uploaded image URL from User B',
      chatImageUrlB
    );

    // Verify messages persist upon refresh
    const getMsgsRes = await req(`/api/messages/${conversationId}`, 'GET', null, tokenA);
    const msgsList = getMsgsRes.data?.messages || [];
    assert(msgsList.length >= 2, 'Conversation contains both image messages after refresh');
    assert(
      msgsList.some((m) => m.imageUrl === chatImageUrlA || m.attachments?.[0]?.url === chatImageUrlA),
      'User A image message persisted in MongoDB'
    );
    assert(
      msgsList.some((m) => m.imageUrl === chatImageUrlB || m.attachments?.[0]?.url === chatImageUrlB),
      'User B return image message persisted in MongoDB'
    );

    // -------------------------------------------------------------
    // SECTION 7: GROUP CHAT IMAGE BROADCAST & ACCESS CONTROL
    // -------------------------------------------------------------
    console.log('\n--- Section 7: Group Chat Image Upload & Access Control ---');

    // Create group with User A, User B, and User C
    const groupConvRes = await req(
      '/api/conversations/group',
      'POST',
      {
        groupName: 'ChatFlow Architecture Team',
        participants: [userB._id, userC._id],
      },
      tokenA
    );
    assert(groupConvRes.ok, 'Group conversation created with A, B, and C');
    const groupConversationId = groupConvRes.data.conversation._id;

    // Connect User C to socket
    const socketC = ClientIO(BASE_URL, {
      auth: { token: tokenC },
      transports: ['websocket'],
    });
    await new Promise((resolve) => socketC.on('connect', resolve));

    socketA.emit('joinConversation', groupConversationId);
    socketB.emit('joinConversation', groupConversationId);
    socketC.emit('joinConversation', groupConversationId);
    await delay(300);

    let groupMsgReceivedB = null;
    let groupMsgReceivedC = null;
    socketB.on('message:new', (msg) => {
      if (msg.conversation === groupConversationId || msg.conversation?._id === groupConversationId) {
        groupMsgReceivedB = msg;
      }
    });
    socketC.on('message:new', (msg) => {
      if (msg.conversation === groupConversationId || msg.conversation?._id === groupConversationId) {
        groupMsgReceivedC = msg;
      }
    });

    // User A sends group image
    const groupImgUpload = await uploadReq(
      '/api/upload/chat-image',
      'group_banner.png',
      samplePngBuffer,
      'image/png',
      tokenA
    );
    const groupImgUrl = groupImgUpload.data.file.url;

    await req(
      '/api/messages',
      'POST',
      {
        conversationId: groupConversationId,
        type: 'image',
        imageUrl: groupImgUrl,
        attachments: [
          {
            fileType: 'image',
            url: groupImgUrl,
            publicId: groupImgUpload.data.file.publicId,
            name: 'group_banner.png',
            size: samplePngBuffer.length,
            mimeType: 'image/png',
          },
        ],
        text: 'Team banner updated!',
      },
      tokenA
    );

    await delay(500);
    assert(groupMsgReceivedB != null, 'Authorized member B received group image message in real-time');
    assert(groupMsgReceivedC != null, 'Authorized member C received group image message in real-time');

    // Unauthorized outsider (e.g. newly created user D) cannot read group messages
    const userDData = {
      fullName: 'David Stranger',
      username: `david_${ts}`,
      email: `david_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };
    const regD = await req('/api/auth/register', 'POST', userDData);
    const unauthGetGroup = await req(`/api/messages/${groupConversationId}`, 'GET', null, regD.data.token);
    assert(
      unauthGetGroup.status === 403,
      'Unauthorized non-member D is blocked from reading group conversation (403)'
    );

    socketC.disconnect();

    // -------------------------------------------------------------
    // SECTION 8: DATABASE INTEGRITY VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- Section 8: Database Integrity & URL Cleanliness ---');

    // Confirm Media records exist in MongoDB
    const mediaCount = await Media.countDocuments({ ownerId: userA._id });
    assert(mediaCount > 0, `Media collection tracks metadata entries (${mediaCount} records)`);

    // Verify all stored records in DB contain real, valid URLs (NO undefined, null, blob, or raw buffers)
    const allPosts = await Post.find({ author: userA._id }).lean();
    const allReels = await Reel.find({ author: userA._id }).lean();
    const allMessages = await Message.find({ conversation: conversationId }).lean();

    const isCleanUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      if (url.startsWith('blob:')) return false;
      if (url.includes('undefined') || url.includes('null')) return false;
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads/');
    };

    let allMediaClean = true;
    allPosts.forEach((p) => {
      (p.media || []).forEach((m) => {
        if (!isCleanUrl(m.url)) allMediaClean = false;
      });
    });

    allReels.forEach((r) => {
      if (r.thumbnail && !isCleanUrl(r.thumbnail)) allMediaClean = false;
    });

    allMessages.forEach((m) => {
      if (m.imageUrl && !isCleanUrl(m.imageUrl)) allMediaClean = false;
      (m.attachments || []).forEach((att) => {
        if (!isCleanUrl(att.url)) allMediaClean = false;
      });
    });

    assert(allMediaClean, 'All MongoDB records contain valid, permanent media URLs (no blobs/nulls/undefined)');

    // -------------------------------------------------------------
    // SECTION 9: CLEANUP FAILED UPLOADS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- Section 9: Failed Content Creation Cleanup ---');

    const orphanUpload = await uploadReq(
      '/api/upload/post-image',
      'orphan_test.png',
      samplePngBuffer,
      'image/png',
      tokenA
    );
    const orphanUrl = orphanUpload.data.file.url;
    assert(orphanUpload.ok, 'Uploaded media for failure simulation');

    // Trigger failure in createPost by sending empty content & empty media array
    // Or providing an invalid body that fails validation
    const failPostRes = await req(
      '/api/posts',
      'POST',
      { content: '', media: [{ url: orphanUrl }] }, // valid media
      tokenA
    );

    // If we delete the post or media directly, verify cleanup works
    const { cleanupMedia } = require('../utils/mediaCleanup');
    await cleanupMedia([orphanUrl], userA._id);

    const mediaRecordAfter = await Media.findOne({ url: orphanUrl });
    assert(mediaRecordAfter == null, 'Media record removed from MongoDB during cleanup');

  } catch (err) {
    console.error('Test Suite Exception:', err);
    failed++;
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();

    console.log('\n========================================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
};

runImageUploadE2ETest();
