require('dotenv').config();
const jwt = require('jsonwebtoken');
const ClientIO = require('socket.io-client');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const UserChatTheme = require('../models/UserChatTheme');
const { app, server } = require('../server');

const TEST_PORT = 5057;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runSharedChatThemeTests = async () => {
  console.log('\n============================================================');
  console.log('🎨 CHATFLOW — SHARED TWO-SIDED CHAT THEME E2E TEST SUITE');
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
  let socketC = null;
  let socketD = null;

  try {
    await connectDB();

    serverInstance = server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Listening on port ${TEST_PORT}`);
    });

    await delay(1000);

    // Clean up test data
    await User.deleteMany({ email: /shared_theme_.*@chatflow\.com/ });
    await Conversation.deleteMany({ groupName: /Shared Theme Test Group/ });
    await UserChatTheme.deleteMany({});

    // 1. Create real accounts
    const userA = await User.create({
      fullName: 'Alice Walker',
      username: 'alice_shared',
      email: 'shared_theme_alice@chatflow.com',
      password: 'Password123!',
    });

    const userB = await User.create({
      fullName: 'Bob Davis',
      username: 'bob_shared',
      email: 'shared_theme_bob@chatflow.com',
      password: 'Password123!',
    });

    const userC = await User.create({
      fullName: 'Charlie Green',
      username: 'charlie_shared',
      email: 'shared_theme_charlie@chatflow.com',
      password: 'Password123!',
    });

    const userD = await User.create({
      fullName: 'Diana Prince',
      username: 'diana_shared',
      email: 'shared_theme_diana@chatflow.com',
      password: 'Password123!',
    });

    const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');
    const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');
    const tokenC = jwt.sign({ id: userC._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');
    const tokenD = jwt.sign({ id: userD._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');

    const headersA = { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' };
    const headersB = { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' };
    const headersC = { Authorization: `Bearer ${tokenC}`, 'Content-Type': 'application/json' };
    const headersD = { Authorization: `Bearer ${tokenD}`, 'Content-Type': 'application/json' };

    // Create Direct Conversation 1 (Alice & Bob)
    const conv1 = await Conversation.create({
      type: 'direct',
      participants: [userA._id, userB._id],
    });

    console.log('--- Phase 1: Database Model & Initial State ---');
    assert(conv1.theme === 'default', 'Conversation schema default theme is "default"');

    const resAInit = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, { headers: headersA });
    const dataAInit = await resAInit.json();
    assert(resAInit.status === 200 && dataAInit.theme === 'default', 'User A reads default theme');

    const resBInit = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, { headers: headersB });
    const dataBInit = await resBInit.json();
    assert(resBInit.status === 200 && dataBInit.theme === 'default', 'User B reads default theme');

    console.log('\n--- Phase 2: Socket.IO Setup for User A & User B ---');
    socketA = ClientIO(BASE_URL, { auth: { token: tokenA }, transports: ['websocket'] });
    socketB = ClientIO(BASE_URL, { auth: { token: tokenB }, transports: ['websocket'] });

    await new Promise((resolve) => {
      let count = 0;
      const done = () => { count++; if (count === 2) resolve(); };
      socketA.on('connect', done);
      socketB.on('connect', done);
    });

    socketA.emit('joinConversation', conv1._id.toString());
    socketB.emit('joinConversation', conv1._id.toString());
    await delay(300);

    // Track Socket.IO chat:themeUpdated events
    const receivedA = [];
    const receivedB = [];
    socketA.on('chat:themeUpdated', (evt) => receivedA.push(evt));
    socketB.on('chat:themeUpdated', (evt) => receivedB.push(evt));

    console.log('\n--- Phase 3: Test 1 - User A changes theme to BLUE ---');
    const resUpdateBlue = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({ theme: 'blue' }),
    });
    const dataUpdateBlue = await resUpdateBlue.json();
    assert(resUpdateBlue.status === 200 && dataUpdateBlue.success, 'User A PUT theme=blue succeeds');
    assert(dataUpdateBlue.theme === 'blue', 'Returned theme is "blue"');

    // Wait for real-time socket events
    await delay(400);

    const bReceivedBlue = receivedB.find(
      (e) => e.conversationId === conv1._id.toString() && e.theme === 'blue'
    );
    assert(!!bReceivedBlue, 'User B received real-time "chat:themeUpdated" with theme=blue WITHOUT page refresh');

    const aReceivedBlue = receivedA.find(
      (e) => e.conversationId === conv1._id.toString() && e.theme === 'blue'
    );
    assert(!!aReceivedBlue, 'User A received real-time "chat:themeUpdated" in room');

    // Check DB persistence
    const dbConvAfterBlue = await Conversation.findById(conv1._id);
    assert(dbConvAfterBlue.theme === 'blue', 'MongoDB conversation.theme is persisted as "blue"');

    console.log('\n--- Phase 4: Test 2 - User B changes theme to PURPLE ---');
    const resUpdatePurple = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, {
      method: 'PUT',
      headers: headersB,
      body: JSON.stringify({ theme: 'purple' }),
    });
    const dataUpdatePurple = await resUpdatePurple.json();
    assert(resUpdatePurple.status === 200 && dataUpdatePurple.success, 'User B PUT theme=purple succeeds');
    assert(dataUpdatePurple.theme === 'purple', 'Returned theme is "purple"');

    await delay(400);

    const aReceivedPurple = receivedA.find(
      (e) => e.conversationId === conv1._id.toString() && e.theme === 'purple'
    );
    assert(!!aReceivedPurple, 'User A received real-time "chat:themeUpdated" with theme=purple WITHOUT page refresh');

    const dbConvAfterPurple = await Conversation.findById(conv1._id);
    assert(dbConvAfterPurple.theme === 'purple', 'MongoDB conversation.theme is persisted as "purple"');

    console.log('\n--- Phase 5: Refresh Test - Persistence on Page Reload ---');
    const refreshA = await fetch(`${BASE_URL}/api/conversations/${conv1._id}`, { headers: headersA });
    const dataRefreshA = await refreshA.json();
    assert(dataRefreshA.conversation.theme === 'purple', 'User A sees "purple" on full conversation reload');

    const refreshB = await fetch(`${BASE_URL}/api/conversations/${conv1._id}`, { headers: headersB });
    const dataRefreshB = await refreshB.json();
    assert(dataRefreshB.conversation.theme === 'purple', 'User B sees "purple" on full conversation reload');

    const themeResA = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, { headers: headersA });
    const themeDataA = await themeResA.json();
    assert(themeDataA.theme === 'purple', 'User A GET theme endpoint returns "purple"');

    console.log('\n--- Phase 6: Conversation Isolation ---');
    // Create Conversation 2 between User A & User C
    const conv2 = await Conversation.create({
      type: 'direct',
      participants: [userA._id, userC._id],
      theme: 'default',
    });

    // Set Conversation 1 to blue
    await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({ theme: 'blue' }),
    });

    // Set Conversation 2 to purple
    await fetch(`${BASE_URL}/api/conversations/${conv2._id}/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({ theme: 'purple' }),
    });

    const verifyConv1 = await Conversation.findById(conv1._id);
    const verifyConv2 = await Conversation.findById(conv2._id);

    assert(verifyConv1.theme === 'blue', 'Conversation 1 retains theme "blue"');
    assert(verifyConv2.theme === 'purple', 'Conversation 2 retains theme "purple"');
    assert(verifyConv1.theme !== verifyConv2.theme, 'Conversations are strictly isolated');

    console.log('\n--- Phase 7: Group Chat Synchronization ---');
    const groupConv = await Conversation.create({
      type: 'group',
      groupName: 'Shared Theme Test Group',
      participants: [userA._id, userB._id, userC._id, userD._id],
      admins: [userA._id],
      theme: 'default',
    });

    socketC = ClientIO(BASE_URL, { auth: { token: tokenC }, transports: ['websocket'] });
    socketD = ClientIO(BASE_URL, { auth: { token: tokenD }, transports: ['websocket'] });

    await new Promise((resolve) => {
      let count = 0;
      const done = () => { count++; if (count === 2) resolve(); };
      socketC.on('connect', done);
      socketD.on('connect', done);
    });

    socketA.emit('joinConversation', groupConv._id.toString());
    socketB.emit('joinConversation', groupConv._id.toString());
    socketC.emit('joinConversation', groupConv._id.toString());
    socketD.emit('joinConversation', groupConv._id.toString());
    await delay(300);

    const groupReceivedA = [];
    const groupReceivedB = [];
    const groupReceivedD = [];
    socketA.on('chat:themeUpdated', (e) => { if (e.conversationId === groupConv._id.toString()) groupReceivedA.push(e); });
    socketB.on('chat:themeUpdated', (e) => { if (e.conversationId === groupConv._id.toString()) groupReceivedB.push(e); });
    socketD.on('chat:themeUpdated', (e) => { if (e.conversationId === groupConv._id.toString()) groupReceivedD.push(e); });

    // User C changes group theme to GREEN
    const resGroupGreen = await fetch(`${BASE_URL}/api/conversations/${groupConv._id}/theme`, {
      method: 'PUT',
      headers: headersC,
      body: JSON.stringify({ theme: 'green' }),
    });
    const dataGroupGreen = await resGroupGreen.json();
    assert(resGroupGreen.status === 200 && dataGroupGreen.success, 'User C PUT group theme=green succeeds');

    await delay(400);

    assert(groupReceivedA.some((e) => e.theme === 'green'), 'Group member User A received theme "green" in real-time');
    assert(groupReceivedB.some((e) => e.theme === 'green'), 'Group member User B received theme "green" in real-time');
    assert(groupReceivedD.some((e) => e.theme === 'green'), 'Group member User D received theme "green" in real-time');

    const dbGroup = await Conversation.findById(groupConv._id);
    assert(dbGroup.theme === 'green', 'Group conversation theme stored once on Conversation document as "green"');

    console.log('\n--- Phase 8: Authorization & Security Checks ---');
    // 1. Unauthenticated request rejected
    const unauthRes = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'ocean' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated user rejected (401)');

    // 2. Non-participant User D attempts to modify Conversation 1 (Alice & Bob)
    const outsiderRes = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, {
      method: 'PUT',
      headers: headersD,
      body: JSON.stringify({ theme: 'sunset' }),
    });
    assert(outsiderRes.status === 403, 'Non-participant outsider rejected (403 Forbidden)');

    // 3. Invalid conversation ID
    const badIdRes = await fetch(`${BASE_URL}/api/conversations/not_a_valid_id/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({ theme: 'blue' }),
    });
    assert(badIdRes.status === 400, 'Invalid conversation ID rejected (400 Bad Request)');

    // 4. Invalid theme name
    const badThemeRes = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({ theme: 'unsupported_dangerous_theme' }),
    });
    assert(badThemeRes.status === 400, 'Invalid theme name rejected (400 Bad Request)');

    // 5. Case-insensitive normalization (e.g. "BLUE" -> "blue")
    const upperThemeRes = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({ theme: 'BLUE' }),
    });
    const upperData = await upperThemeRes.json();
    assert(upperThemeRes.status === 200 && upperData.theme === 'blue', 'Uppercase "BLUE" correctly normalized to "blue"');

    console.log('\n--- Phase 9: Reset to Default Theme ---');
    const resetRes = await fetch(`${BASE_URL}/api/conversations/${conv1._id}/theme`, {
      method: 'DELETE',
      headers: headersA,
    });
    const resetData = await resetRes.json();
    assert(resetRes.status === 200 && resetData.success && resetData.theme === 'default', 'Reset theme succeeds with theme="default"');

    const dbResetConv = await Conversation.findById(conv1._id);
    assert(dbResetConv.theme === 'default', 'MongoDB conversation.theme reset to "default"');

    console.log('\n--- Phase 10: Confirmation of No Duplicate User-Specific Records ---');
    const userSpecificCount = await UserChatTheme.countDocuments({});
    assert(userSpecificCount === 0, 'No UserChatTheme documents created; conversation.theme is the single source of truth');

    console.log('\n============================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (socketC) socketC.disconnect();
    if (socketD) socketD.disconnect();
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runSharedChatThemeTests();
