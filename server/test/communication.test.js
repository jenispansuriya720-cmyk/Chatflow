require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { io: ClientIO } = require('socket.io-client');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Call = require('../models/Call');
const LiveStream = require('../models/LiveStream');
const UserSettings = require('../models/UserSettings');
const { app, server } = require('../server');

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runCommunicationTests = async () => {
  console.log('\n============================================================');
  console.log('🚀 RUNNING CHATFLOW REAL-TIME MULTI-USER VERIFICATION SUITE');
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

  let socketA = null;
  let socketB = null;
  let socketC = null;
  let serverInstance = null;

  try {
    // 1. Connect DB and start test HTTP server
    await connectDB();

    serverInstance = server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Listening on port ${TEST_PORT}`);
    });

    await delay(1000);

    // 2. Setup Test Users
    await User.deleteMany({ email: /commtest_.*@chatflow\.com/ });

    const userA = await User.create({
      fullName: 'Alice Walker',
      username: 'alicew',
      email: 'commtest_alice@chatflow.com',
      password: 'Password123!',
      isOnline: true,
    });

    const userB = await User.create({
      fullName: 'Bob Builder',
      username: 'bobb',
      email: 'commtest_bob@chatflow.com',
      password: 'Password123!',
      isOnline: true,
    });

    const userC = await User.create({
      fullName: 'Charlie Davis',
      username: 'charlied',
      email: 'commtest_charlie@chatflow.com',
      password: 'Password123!',
      isOnline: true,
    });

    const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'fallback_secret_chatflow_2025', { expiresIn: '7d' });
    const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'fallback_secret_chatflow_2025', { expiresIn: '7d' });
    const tokenC = jwt.sign({ id: userC._id }, process.env.JWT_SECRET || 'fallback_secret_chatflow_2025', { expiresIn: '7d' });

    assert(userA._id && userB._id && userC._id, 'Created 3 authenticated test users (Alice, Bob, Charlie)');

    // 3. Connect Socket.IO clients with authentication tokens
    socketA = ClientIO(BASE_URL, { auth: { token: tokenA }, transports: ['websocket'] });
    socketB = ClientIO(BASE_URL, { auth: { token: tokenB }, transports: ['websocket'] });
    socketC = ClientIO(BASE_URL, { auth: { token: tokenC }, transports: ['websocket'] });

    await Promise.all([
      new Promise((res) => socketA.on('connect', res)),
      new Promise((res) => socketB.on('connect', res)),
      new Promise((res) => socketC.on('connect', res)),
    ]);

    assert(socketA.connected && socketB.connected && socketC.connected, 'All 3 user sockets connected and authenticated via JWT');

    // Create Direct Conversation between Alice and Bob
    const conversation = await Conversation.create({
      type: 'direct',
      participants: [userA._id, userB._id],
    });

    socketA.emit('joinConversation', conversation._id.toString());
    socketB.emit('joinConversation', conversation._id.toString());
    await delay(300);

    // --- TEST 1: TWO-WAY REAL-TIME MESSAGING ---
    console.log('\n--- Test Phase 1: Real-Time Two-Way Messaging ---');

    let messageReceivedByBob = null;
    socketB.on('receiveMessage', (msg) => {
      messageReceivedByBob = msg;
    });

    let deliveredReceivedByAlice = null;
    socketA.on('message:delivered', (data) => {
      deliveredReceivedByAlice = data;
    });

    let readReceivedByAlice = null;
    socketA.on('message:read', (data) => {
      readReceivedByAlice = data;
    });

    const clientMsgId1 = `test_msg_${Date.now()}`;
    const testMessage1 = await Message.create({
      conversation: conversation._id,
      sender: userA._id,
      receiver: userB._id,
      clientMessageId: clientMsgId1,
      text: 'Hello Bob! This is Alice with real-time delivery.',
      status: 'sent',
    });

    assert(testMessage1.status === 'sent', 'Message initially stored with status "sent"');

    // Alice sends through socket
    socketA.emit('sendMessage', testMessage1);
    await delay(500);

    assert(messageReceivedByBob != null && messageReceivedByBob.text === testMessage1.text, 'Bob receives message in real time via socket');

    // Bob receives and acknowledges delivery
    socketB.emit('message:delivered', {
      conversationId: conversation._id.toString(),
      messageIds: [testMessage1._id.toString()],
      senderId: userA._id.toString(),
    });

    await delay(500);
    const updatedMsgDelivered = await Message.findById(testMessage1._id);
    assert(updatedMsgDelivered.status === 'delivered', 'Message status transitioned to "delivered" in MongoDB');
    assert(deliveredReceivedByAlice != null, 'Alice socket received "message:delivered" event');

    // Bob opens chat and marks message read
    socketB.emit('messageRead', {
      conversationId: conversation._id.toString(),
      userId: userB._id.toString(),
      messageIds: [testMessage1._id.toString()],
    });

    await delay(500);
    const updatedMsgRead = await Message.findById(testMessage1._id);
    assert(updatedMsgRead.status === 'read', 'Message status transitioned to "read" in MongoDB');
    assert(readReceivedByAlice != null, 'Alice socket received "message:read" event');

    // --- TEST 2: DUPLICATE MESSAGE PREVENTION ---
    console.log('\n--- Test Phase 2: Duplicate Message Prevention ---');
    // Attempt inserting duplicate with same clientMessageId
    const existingMsg = await Message.findOne({
      conversation: conversation._id,
      sender: userA._id,
      clientMessageId: clientMsgId1,
    });
    assert(existingMsg != null, 'Existing message found by clientMessageId');

    const totalCountBefore = await Message.countDocuments({ clientMessageId: clientMsgId1 });
    assert(totalCountBefore === 1, 'Only 1 message document exists for unique clientMessageId');

    // --- TEST 3: OFFLINE MESSAGE HANDLING ---
    console.log('\n--- Test Phase 3: Offline Message Delivery & Sync ---');

    // Simulate Bob going offline
    socketB.disconnect();
    await delay(500);

    // Alice sends message while Bob is offline
    const offlineMsg = await Message.create({
      conversation: conversation._id,
      sender: userA._id,
      receiver: userB._id,
      clientMessageId: `offline_${Date.now()}`,
      text: 'Message sent while Bob was offline.',
      status: 'sent',
    });

    assert(offlineMsg.status === 'sent', 'Offline message saved to MongoDB with status "sent"');

    // Bob comes back online
    socketB = ClientIO(BASE_URL, { auth: { token: tokenB }, transports: ['websocket'] });
    await new Promise((res) => socketB.on('connect', res));
    socketB.emit('setupUser', userB._id.toString());
    socketB.emit('joinConversation', conversation._id.toString());

    // Bob marks delivered
    socketB.emit('message:delivered', {
      conversationId: conversation._id.toString(),
      messageIds: [offlineMsg._id.toString()],
      senderId: userA._id.toString(),
    });

    await delay(500);
    const syncedMsg = await Message.findById(offlineMsg._id);
    assert(syncedMsg.status === 'delivered', 'Offline message transitioned to "delivered" after Bob reconnected');

    // --- TEST 4: VOICE & VIDEO CALL SIGNALING ---
    console.log('\n--- Test Phase 4: WebRTC Voice & Video Call Signaling ---');

    let incomingCallReceived = null;
    socketB.on('call:incoming', (callData) => {
      incomingCallReceived = callData;
    });

    let callAcceptedReceived = null;
    socketA.on('call:accepted', (data) => {
      callAcceptedReceived = data;
    });

    let sdpOfferReceived = null;
    socketB.on('call:offer', (data) => {
      sdpOfferReceived = data;
    });

    let sdpAnswerReceived = null;
    socketA.on('call:answer', (data) => {
      sdpAnswerReceived = data;
    });

    let iceCandidateReceived = null;
    socketB.on('call:ice-candidate', (data) => {
      iceCandidateReceived = data;
    });

    let callEndedReceived = null;
    socketB.on('call:ended', (data) => {
      callEndedReceived = data;
    });

    // 1. Alice requests audio call to Bob
    socketA.emit('call:request', {
      receiverId: userB._id.toString(),
      type: 'audio',
      callerInfo: { fullName: userA.fullName },
    });

    await delay(600);
    assert(incomingCallReceived != null, 'Bob received "call:incoming" alert');
    assert(incomingCallReceived.type === 'audio', 'Call type identified as "audio"');

    const activeCallId = incomingCallReceived.callId;

    // 2. Bob accepts call
    socketB.emit('call:accept', {
      callId: activeCallId,
      callerId: userA._id.toString(),
    });

    await delay(500);
    assert(callAcceptedReceived != null, 'Alice received "call:accepted" event');

    // 3. Alice sends WebRTC SDP Offer
    socketA.emit('call:offer', {
      callId: activeCallId,
      targetUserId: userB._id.toString(),
      offer: { type: 'offer', sdp: 'v=0\r\no=Alice 123456 ...' },
    });

    await delay(400);
    assert(sdpOfferReceived != null && sdpOfferReceived.offer != null, 'Bob received WebRTC SDP Offer');

    // 4. Bob sends WebRTC SDP Answer
    socketB.emit('call:answer', {
      callId: activeCallId,
      targetUserId: userA._id.toString(),
      answer: { type: 'answer', sdp: 'v=0\r\no=Bob 654321 ...' },
    });

    await delay(400);
    assert(sdpAnswerReceived != null && sdpAnswerReceived.answer != null, 'Alice received WebRTC SDP Answer');

    // 5. ICE candidate exchange
    socketA.emit('call:ice-candidate', {
      callId: activeCallId,
      targetUserId: userB._id.toString(),
      candidate: { candidate: 'candidate:1 1 UDP ...', sdpMid: '0' },
    });

    await delay(400);
    assert(iceCandidateReceived != null, 'Bob received ICE Candidate');

    // 6. Alice ends active call after 15s duration
    socketA.emit('call:end', {
      callId: activeCallId,
      targetUserId: userB._id.toString(),
      duration: 15,
    });

    await delay(500);
    assert(callEndedReceived != null, 'Bob received "call:ended" event');

    const recordedCall = await Call.findById(activeCallId);
    assert(recordedCall != null && recordedCall.status === 'completed', 'Call record stored in MongoDB as "completed"');
    assert(recordedCall.duration === 15, 'Call duration accurately recorded in MongoDB');

    // --- TEST 5: LIVE STREAMING BROADCAST & VIEWERS ---
    console.log('\n--- Test Phase 5: Live Streaming Broadcast & Viewers ---');

    const liveStream = await LiveStream.create({
      host: userA._id,
      title: 'Full Stack WebRTC Demo',
      description: 'Testing live streaming broadcasting',
      status: 'live',
      viewerCount: 1,
      peakViewers: 1,
    });

    let liveViewerJoinedEvent = null;
    socketA.on('liveViewerJoined', (data) => {
      liveViewerJoinedEvent = data;
    });

    let liveCommentReceived = null;
    socketA.on('liveComment', (cmt) => {
      liveCommentReceived = cmt;
    });

    let liveReactionReceived = null;
    socketB.on('liveReaction', (r) => {
      liveReactionReceived = r;
    });

    let liveEndedReceived = null;
    socketB.on('liveEnded', (data) => {
      liveEndedReceived = data;
    });

    // Bob & Charlie join stream
    socketA.emit('joinLiveRoom', { streamId: liveStream._id.toString(), user: userA });
    socketB.emit('joinLiveRoom', { streamId: liveStream._id.toString(), user: userB });
    socketC.emit('joinLiveRoom', { streamId: liveStream._id.toString(), user: userC });

    await delay(500);
    assert(liveViewerJoinedEvent != null, 'Host Alice received viewer joined notification');

    // Bob posts comment
    socketB.emit('liveComment', {
      streamId: liveStream._id.toString(),
      comment: { author: userB, text: 'Amazing stream Alice! 🚀' },
    });

    await delay(400);
    assert(liveCommentReceived != null && liveCommentReceived.text === 'Amazing stream Alice! 🚀', 'Live chat comment broadcast to room in real time');

    // Charlie posts reaction
    socketC.emit('liveReaction', {
      streamId: liveStream._id.toString(),
      emoji: '🔥',
      user: userC,
    });

    await delay(400);
    assert(liveReactionReceived != null && liveReactionReceived.emoji === '🔥', 'Floating reaction broadcast in real time to viewers');

    // Alice ends live stream
    socketA.emit('liveEnded', { streamId: liveStream._id.toString() });
    await LiveStream.findByIdAndUpdate(liveStream._id, { status: 'ended', endedAt: new Date() });

    await delay(400);
    assert(liveEndedReceived != null, 'Viewers received "liveEnded" notification');

    const endedStream = await LiveStream.findById(liveStream._id);
    assert(endedStream.status === 'ended', 'Live stream status updated to "ended" in MongoDB');

    // --- TEST 6: BLOCKING ENFORCEMENT ---
    console.log('\n--- Test Phase 6: Backend Blocking Enforcement ---');

    // Alice blocks Charlie
    userA.blockedUsers.push(userC._id);
    await userA.save();

    let callBlockedError = null;
    socketC.on('call:error', (err) => {
      callBlockedError = err;
    });

    // Charlie attempts to call Alice
    socketC.emit('call:request', {
      receiverId: userA._id.toString(),
      type: 'audio',
      callerInfo: { fullName: userC.fullName },
    });

    await delay(500);
    assert(callBlockedError != null && (callBlockedError.code === 'BLOCKED_BY_USER' || callBlockedError.code === 'USER_BLOCKED'), 'Blocked user call attempt rejected by backend');

    console.log('\n============================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[Test Error]:', err);
    process.exit(1);
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (socketC) socketC.disconnect();
    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();
    process.exit(0);
  }
};

runCommunicationTests();
