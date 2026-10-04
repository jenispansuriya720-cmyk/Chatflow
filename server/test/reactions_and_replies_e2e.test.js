require('dotenv').config();
const jwt = require('jsonwebtoken');
const ClientIO = require('socket.io-client');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { app, server } = require('../server');

const TEST_PORT = 5059;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runReactionsAndRepliesTests = async () => {
  console.log('\n============================================================');
  console.log('💬 CHATFLOW — REACTIONS & REPLIES REAL-TIME E2E TEST SUITE');
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

    await delay(1000);

    // Clean up test data
    await User.deleteMany({ email: /rxn_test_.*@chatflow\.com/ });
    await Conversation.deleteMany({ 'participants.email': /rxn_test_.*@chatflow\.com/ });

    // 1. Create real users
    const userA = await User.create({
      fullName: 'Alice Walker',
      username: 'alice_rxn',
      email: 'rxn_test_alice@chatflow.com',
      password: 'Password123!',
    });

    const userB = await User.create({
      fullName: 'Bob Davis',
      username: 'bob_rxn',
      email: 'rxn_test_bob@chatflow.com',
      password: 'Password123!',
    });

    const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');
    const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');

    const headersA = { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' };
    const headersB = { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' };

    // Create Direct Conversation between Alice and Bob
    const conversation = await Conversation.create({
      type: 'direct',
      participants: [userA._id, userB._id],
    });

    console.log('--- Phase 1: Socket Connections & Joining Rooms ---');

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

    assert(socketA.connected, 'User A connected to Socket.IO');
    assert(socketB.connected, 'User B connected to Socket.IO');

    socketA.emit('joinConversation', conversation._id.toString());
    socketB.emit('joinConversation', conversation._id.toString());
    await delay(500);

    console.log('\n--- Phase 2: Send Message & Receive in Real Time ---');

    let receivedMsgB = null;
    socketB.on('receiveMessage', (msg) => {
      receivedMsgB = msg;
    });

    // User A sends message
    const sendRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        conversationId: conversation._id.toString(),
        text: 'Hello Bob! How are you today?',
        type: 'text',
      }),
    });

    const sendData = await sendRes.json();
    assert(sendData.success && sendData.message?._id, 'User A sent message successfully');
    const messageId = sendData.message._id;

    // Wait for User B socket
    await delay(600);
    assert(receivedMsgB && receivedMsgB._id === messageId, 'User B received message via Socket.IO');

    console.log('\n--- Phase 3: Message Reaction — Real-Time & Persistence ---');

    let reactionUpdatedA = null;
    socketA.on('message:reactionUpdated', (payload) => {
      reactionUpdatedA = payload;
    });

    // 1. User B reacts ❤️
    const reactRes1 = await fetch(`${BASE_URL}/api/messages/${messageId}/react`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({ emoji: '❤️' }),
    });

    const reactData1 = await reactRes1.json();
    assert(reactData1.success, 'User B reacted ❤️ via API');
    assert(
      reactData1.reactions.some((r) => r.emoji === '❤️' && (r.user?._id || r.user).toString() === userB._id.toString()),
      'User B reaction ❤️ saved in MongoDB'
    );

    await delay(500);
    assert(
      reactionUpdatedA &&
        reactionUpdatedA.messageId === messageId &&
        reactionUpdatedA.reactions.some((r) => r.emoji === '❤️'),
      'User A received message:reactionUpdated event for ❤️ via Socket.IO'
    );

    // 2. User A reacts 😂
    let reactionUpdatedB = null;
    socketB.on('message:reactionUpdated', (payload) => {
      reactionUpdatedB = payload;
    });

    const reactRes2 = await fetch(`${BASE_URL}/api/messages/${messageId}/react`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({ emoji: '😂' }),
    });

    const reactData2 = await reactRes2.json();
    assert(reactData2.success, 'User A reacted 😂 via API');
    assert(reactData2.reactions.length === 2, 'Message now has 2 distinct user reactions');

    await delay(500);
    assert(
      reactionUpdatedB &&
        reactionUpdatedB.reactions.some((r) => r.emoji === '😂'),
      'User B received User A reaction 😂 in real time'
    );

    // 3. User A changes reaction 😂 -> 👍 (Updating reaction)
    const reactRes3 = await fetch(`${BASE_URL}/api/messages/${messageId}/react`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({ emoji: '👍' }),
    });

    const reactData3 = await reactRes3.json();
    assert(reactData3.success, 'User A changed reaction to 👍');
    const userAReactions = reactData3.reactions.filter(
      (r) => (r.user?._id || r.user).toString() === userA._id.toString()
    );
    assert(userAReactions.length === 1 && userAReactions[0].emoji === '👍', 'User A replaced 😂 with 👍 (no duplicate)');

    // 4. User B removes reaction by tapping ❤️ again
    reactionUpdatedA = null;
    const reactRes4 = await fetch(`${BASE_URL}/api/messages/${messageId}/react`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({ emoji: '❤️' }),
    });

    const reactData4 = await reactRes4.json();
    assert(reactData4.success, 'User B tapped ❤️ again to remove reaction');
    const userBReactions = reactData4.reactions.filter(
      (r) => (r.user?._id || r.user).toString() === userB._id.toString()
    );
    assert(userBReactions.length === 0, 'User B reaction ❤️ was removed from MongoDB');

    await delay(500);
    assert(
      reactionUpdatedA && !reactionUpdatedA.reactions.some((r) => (r.user?._id || r.user).toString() === userB._id.toString()),
      'User A immediately received removal update via Socket.IO'
    );

    console.log('\n--- Phase 4: Message Reply Attachment & Persistence ---');

    let replyMsgA = null;
    socketA.on('receiveMessage', (msg) => {
      if (msg.replyTo) replyMsgA = msg;
    });

    // User B sends a reply referencing messageId
    const replyRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({
        conversationId: conversation._id.toString(),
        text: 'I am doing great Alice!',
        replyTo: messageId,
        replyToMessageId: messageId,
      }),
    });

    const replyData = await replyRes.json();
    assert(replyData.success, 'User B sent reply message to API');
    assert(replyData.message?.replyTo?._id === messageId, 'Reply message stored valid replyTo reference in MongoDB');
    assert(replyData.message?.replyTo?.text === 'Hello Bob! How are you today?', 'replyTo populated with original message text');
    assert(replyData.message?.replyTo?.sender?.fullName === 'Alice Walker', 'replyTo populated with original sender info');

    await delay(600);
    assert(replyMsgA && replyMsgA.replyTo?._id === messageId, 'User A received reply in real time with populated replyTo');

    console.log('\n--- Phase 5: Soft Delete Original Message (Graceful Fallback) ---');

    // User A soft deletes original message
    const delRes = await fetch(`${BASE_URL}/api/messages/${messageId}?deleteType=for_everyone`, {
      method: 'DELETE',
      headers: headersA,
    });
    const delData = await delRes.json();
    assert(delData.success, 'Original message was soft deleted for everyone');

    // Fetch messages for conversation
    const getRes = await fetch(`${BASE_URL}/api/messages/${conversation._id}`, {
      headers: headersB,
    });
    const getData = await getRes.json();
    const fetchedReply = getData.messages.find((m) => m._id === replyData.message._id);
    assert(fetchedReply && fetchedReply.replyTo, 'Reply still exists and retains reference after original deletion');
    assert(fetchedReply.replyTo.isDeleted === true, 'Original message marked isDeleted in replyTo reference');

    console.log('\n============================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (serverInstance) serverInstance.close();
    await disconnectDB();
    process.exit(0);
  }
};

runReactionsAndRepliesTests();
