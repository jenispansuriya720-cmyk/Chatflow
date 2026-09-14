require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const runTests = async () => {
  console.log('[Tests] Starting ChatFlow Backend Test Suite...');
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

    // Clean test collection
    await User.deleteMany({ email: /test.*@chatflow\.com/ });

    // Test 1: User Registration with password hashing
    const testUser1 = await User.create({
      fullName: 'Test User Alpha',
      username: 'testalpha',
      email: 'testalpha@chatflow.com',
      password: 'Password123!',
      isOnline: true,
    });
    assert(testUser1._id != null, 'User created with valid ID');
    assert(testUser1.password !== 'Password123!', 'Password successfully encrypted');

    // Test 2: Password comparison method
    const isMatch = await testUser1.matchPassword('Password123!');
    assert(isMatch === true, 'Password match verification succeeds');
    const isBadMatch = await testUser1.matchPassword('WrongPassword');
    assert(isBadMatch === false, 'Password mismatch correctly rejected');

    // Test 3: User 2 creation
    const testUser2 = await User.create({
      fullName: 'Test User Beta',
      username: 'testbeta',
      email: 'testbeta@chatflow.com',
      password: 'Password123!',
    });
    assert(testUser2._id != null, 'Second test user created');

    // Test 4: Conversation Creation
    const conversation = await Conversation.create({
      type: 'direct',
      participants: [testUser1._id, testUser2._id],
    });
    assert(conversation.participants.length === 2, 'Direct conversation created with 2 participants');

    // Test 5: Message Creation
    const message = await Message.create({
      conversation: conversation._id,
      sender: testUser1._id,
      receiver: testUser2._id,
      text: 'Hello Beta! This is an automated test message.',
      status: 'sent',
    });
    assert(message.text === 'Hello Beta! This is an automated test message.', 'Message stored correctly');

    // Test 6: Message Reaction
    message.reactions.push({ emoji: '🔥', user: testUser2._id });
    await message.save();
    const updatedMsg = await Message.findById(message._id);
    assert(updatedMsg.reactions.length === 1 && updatedMsg.reactions[0].emoji === '🔥', 'Message reaction stored');

    // Test 7: Blocking functionality
    testUser1.blockedUsers.push(testUser2._id);
    await testUser1.save();
    const updatedUser1 = await User.findById(testUser1._id);
    assert(updatedUser1.blockedUsers.includes(testUser2._id), 'User block successfully updated');

    // Clean up test data
    await User.deleteMany({ email: /test.*@chatflow\.com/ });
    await Message.deleteMany({ conversation: conversation._id });
    await Conversation.findByIdAndDelete(conversation._id);

    console.log('---------------------------------------------------------');
    console.log(`[Tests Summary] Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log('---------------------------------------------------------');

    await disconnectDB();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('[Test Suite Error]:', error);
    await disconnectDB();
    process.exit(1);
  }
};

runTests();
