require('dotenv').config();
const jwt = require('jsonwebtoken');
const ClientIO = require('socket.io-client');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { app, server } = require('../server');

const TEST_PORT = 5058;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runRedesignedChatTests = async () => {
  console.log('\n========================================================================');
  console.log('💬 CHATFLOW: REDESIGNED CHAT CONVERSATION UI & LOGIC E2E TEST SUITE');
  console.log('========================================================================\n');

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

    await delay(1000);

    // Clean up previous test data
    await User.deleteMany({ email: /redesign_test_.*@chatflow\.com/ });
    await Conversation.deleteMany({ groupName: /Redesign Test/ });

    // 1. Two Real Accounts
    const userA = await User.create({
      fullName: 'Alex Morgan',
      username: 'alex_redesign',
      email: 'redesign_test_alex@chatflow.com',
      password: 'Password123!',
      profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    });

    const userB = await User.create({
      fullName: 'Sam Rivera',
      username: 'sam_redesign',
      email: 'redesign_test_sam@chatflow.com',
      password: 'Password123!',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    });

    const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');
    const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');

    const headersA = { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' };
    const headersB = { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' };

    // Create Direct Conversation
    const conv = await Conversation.create({
      type: 'direct',
      participants: [userA._id, userB._id],
      theme: 'default',
    });
    const conversationId = conv._id.toString();

    console.log('--- Phase 1: Real-Time Socket Connections & Room Joining ---');
    socketA = ClientIO(BASE_URL, { auth: { token: tokenA }, transports: ['websocket'] });
    socketB = ClientIO(BASE_URL, { auth: { token: tokenB }, transports: ['websocket'] });

    await new Promise((resolve) => {
      let count = 0;
      const done = () => { count++; if (count === 2) resolve(); };
      socketA.on('connect', done);
      socketB.on('connect', done);
    });

    socketA.emit('joinConversation', conversationId);
    socketB.emit('joinConversation', conversationId);
    await delay(300);

    const receivedA = [];
    const receivedB = [];
    socketA.on('receiveMessage', (msg) => receivedA.push(msg));
    socketB.on('receiveMessage', (msg) => receivedB.push(msg));

    console.log('\n--- Phase 2: User A sends "Hello" ---');
    const resMsg1 = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        conversationId,
        text: 'Hello',
        type: 'text',
      }),
    });
    const dataMsg1 = await resMsg1.json();
    assert(resMsg1.status === 201 && dataMsg1.success, 'User A sent message "Hello"');
    assert(dataMsg1.message.text === 'Hello', 'Message text stored as "Hello"');
    assert(!dataMsg1.message.text.includes('@creator'), 'No @creator in message text');
    assert(!dataMsg1.message.text.includes('POST'), 'No POST in message text');

    // Emit via socket for real-time delivery
    socketA.emit('sendMessage', dataMsg1.message);
    await delay(300);

    const bSawHello = receivedB.find((m) => m.text === 'Hello');
    assert(!!bSawHello, 'User B received "Hello" in real-time');

    console.log('\n--- Phase 3: User B replies "Hi, how are you?" & sends consecutive message ---');
    const resMsg2 = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({
        conversationId,
        text: 'Hi, how are you?',
        type: 'text',
      }),
    });
    const dataMsg2 = await resMsg2.json();
    assert(resMsg2.status === 201 && dataMsg2.success, 'User B sent reply "Hi, how are you?"');
    socketB.emit('sendMessage', dataMsg2.message);

    // Consecutive burst from User B: "Are you free today?"
    const resMsg3 = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({
        conversationId,
        text: 'Are you free today?',
        type: 'text',
      }),
    });
    const dataMsg3 = await resMsg3.json();
    assert(resMsg3.status === 201 && dataMsg3.success, 'User B sent consecutive message "Are you free today?"');
    socketB.emit('sendMessage', dataMsg3.message);

    await delay(400);

    const aSawReply = receivedA.find((m) => m.text === 'Hi, how are you?');
    const aSawBurst = receivedA.find((m) => m.text === 'Are you free today?');
    assert(!!aSawReply, 'User A received "Hi, how are you?" in real-time');
    assert(!!aSawBurst, 'User A received consecutive burst message "Are you free today?" in real-time');

    console.log('\n--- Phase 4: Fetch Conversation Messages & Verify Clean Content ---');
    const getRes = await fetch(`${BASE_URL}/api/messages/${conversationId}`, { headers: headersA });
    const getData = await getRes.json();
    assert(getRes.status === 200 && getData.success, 'Fetched conversation message list');
    assert(getData.messages.length === 3, 'All 3 messages returned');

    // Verify all messages have clean text and real senders
    const allClean = getData.messages.every((m) => {
      const text = m.text || '';
      return !text.includes('@creator') && !text.includes('POST');
    });
    assert(allClean, 'All database messages are clean: zero occurrences of "@creator" or "POST" labels');

    // Verify sender ownership checks
    const m1 = getData.messages[0];
    const m2 = getData.messages[1];
    const m3 = getData.messages[2];

    const isOwnA1 = (m1.sender?._id || m1.sender).toString() === userA._id.toString();
    const isOwnB1 = (m1.sender?._id || m1.sender).toString() === userB._id.toString();
    assert(isOwnA1 && !isOwnB1, 'Message 1 is correctly identified as owned by User A (sent/right)');

    const isOwnA2 = (m2.sender?._id || m2.sender).toString() === userA._id.toString();
    const isOwnB2 = (m2.sender?._id || m2.sender).toString() === userB._id.toString();
    assert(!isOwnA2 && isOwnB2, 'Message 2 is correctly identified as owned by User B (received/left for User A)');

    // Verify grouping: Message 2 and Message 3 have identical sender (User B)
    const sameSenderBurst =
      (m2.sender?._id || m2.sender).toString() === (m3.sender?._id || m3.sender).toString();
    assert(sameSenderBurst, 'Consecutive messages from User B share sender identity for grouped rendering');

    console.log('\n--- Phase 5: Image Message Upload & Clean Rendering ---');
    const imgMsgRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        conversationId,
        text: 'Check this design mockup',
        imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=500',
        type: 'image',
      }),
    });
    const imgData = await imgMsgRes.json();
    assert(imgMsgRes.status === 201 && imgData.success, 'User A sent image message');
    assert(!!imgData.message.imageUrl, 'Image message stores direct imageUrl');
    assert(!imgData.message.text.includes('@creator'), 'Image message text does NOT include @creator');

    console.log('\n--- Phase 6: Real Delivery & Read Status Flow ---');
    // Mark messages as delivered
    socketB.emit('message:delivered', {
      conversationId,
      messageIds: [m1._id.toString()],
      senderId: userA._id.toString(),
    });
    await delay(200);

    // Mark messages as read by User B
    socketB.emit('message:read', {
      conversationId,
      userId: userB._id.toString(),
      messageIds: [m1._id.toString()],
    });
    await delay(300);

    const checkMsg1 = await Message.findById(m1._id);
    assert(checkMsg1.readBy.some((r) => r.user.toString() === userB._id.toString()), 'Message 1 marked as read by User B in database');

    console.log('\n--- Phase 7: Shared Chat Theme Verification ---');
    const themeReceivedB = [];
    socketB.on('chat:themeUpdated', (evt) => themeReceivedB.push(evt));

    // User A changes theme to BLUE
    const themeResA = await fetch(`${BASE_URL}/api/conversations/${conversationId}/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({ theme: 'blue' }),
    });
    const themeDataA = await themeResA.json();
    assert(themeResA.status === 200 && themeDataA.theme === 'blue', 'User A updated shared theme to "blue"');

    await delay(300);
    assert(themeReceivedB.some((e) => e.theme === 'blue'), 'User B received "chat:themeUpdated" with theme="blue" via Socket.IO');

    const dbConvTheme = await Conversation.findById(conversationId);
    assert(dbConvTheme.theme === 'blue', 'MongoDB conversation.theme is persisted as "blue"');

    console.log('\n========================================================================');
    console.log(`🏁 REDESIGN TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runRedesignedChatTests();
