require('dotenv').config();
const jwt = require('jsonwebtoken');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const UserChatTheme = require('../models/UserChatTheme');
const UserSettings = require('../models/UserSettings');
const { app, server } = require('../server');

const TEST_PORT = 5056;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runThemeTests = async () => {
  console.log('\n============================================================');
  console.log('🎨 RUNNING CHATFLOW PERSONAL CHAT THEME VERIFICATION SUITE');
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

  try {
    await connectDB();

    serverInstance = server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Listening on port ${TEST_PORT}`);
    });

    await delay(1000);

    // Setup Test Users
    await User.deleteMany({ email: /themetest_.*@chatflow\.com/ });
    await UserChatTheme.deleteMany({});

    const userA = await User.create({
      fullName: 'Alice Theme',
      username: 'alicetが一',
      email: 'themetest_alice@chatflow.com',
      password: 'Password123!',
    });

    const userB = await User.create({
      fullName: 'Bob Theme',
      username: 'bobt',
      email: 'themetest_bob@chatflow.com',
      password: 'Password123!',
    });

    const userC = await User.create({
      fullName: 'Charlie Outsider',
      username: 'charlieto',
      email: 'themetest_charlie@chatflow.com',
      password: 'Password123!',
    });

    const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');
    const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');
    const tokenC = jwt.sign({ id: userC._id }, process.env.JWT_SECRET || 'chatflow_secret_key_2024');

    // Create Conversation between Alice and Bob
    const conversation = await Conversation.create({
      type: 'direct',
      participants: [userA._id, userB._id],
    });

    const headersA = {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    };
    const headersB = {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    };
    const headersC = {
      Authorization: `Bearer ${tokenC}`,
      'Content-Type': 'application/json',
    };

    console.log('--- Phase 1: Initial Default Theme State ---');
    const resAInit = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      headers: headersA,
    });
    const dataAInit = await resAInit.json();
    assert(resAInit.status === 200, 'Alice can fetch theme for her conversation');
    assert(dataAInit.isDefault === true && dataAInit.theme === null, 'Default theme returned initially');

    console.log('\n--- Phase 2: Personal Theme Setting by User A ---');
    const setResA = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({
        themeType: 'preset',
        themeId: 'midnight',
        bubbleStyle: 'soft',
        fontSize: 'large',
        density: 'compact',
      }),
    });
    const setDataA = await setResA.json();
    assert(setResA.status === 200, 'Alice successfully updated her theme to midnight');
    assert(setDataA.theme.themeId === 'midnight', 'Alice themeId saved as midnight');
    assert(setDataA.theme.bubbleStyle === 'soft', 'Alice bubbleStyle saved as soft');

    console.log('\n--- Phase 3: Verification of Personal Isolation for User B ---');
    const resBCheck = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      headers: headersB,
    });
    const dataBCheck = await resBCheck.json();
    assert(resBCheck.status === 200, 'Bob fetches theme for the same conversation');
    assert(dataBCheck.isDefault === true && dataBCheck.theme === null, 'Bob STILL has default theme! Alice changes did not affect Bob.');

    // Bob now sets his own personal theme to 'ocean'
    const setResB = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      method: 'PUT',
      headers: headersB,
      body: JSON.stringify({
        themeType: 'preset',
        themeId: 'ocean',
        bubbleStyle: 'compact',
      }),
    });
    const setDataB = await setResB.json();
    assert(setDataB.theme.themeId === 'ocean', 'Bob successfully saved his personal theme as ocean');

    // Verify Alice still has 'midnight'
    const resACheckAgain = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      headers: headersA,
    });
    const dataACheckAgain = await resACheckAgain.json();
    assert(dataACheckAgain.theme.themeId === 'midnight', 'Alice theme remains midnight independently of Bob');

    console.log('\n--- Phase 4: Authorization & Privacy Enforcement ---');
    // Charlie is NOT a participant
    const resCGet = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      headers: headersC,
    });
    assert(resCGet.status === 403, 'Charlie is rejected with 403 when trying to read conversation theme');

    const resCPut = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      method: 'PUT',
      headers: headersC,
      body: JSON.stringify({ themeId: 'rose' }),
    });
    assert(resCPut.status === 403, 'Charlie is rejected with 403 when trying to modify conversation theme');

    console.log('\n--- Phase 5: Custom Theme Validation & Sanitization ---');
    const customRes = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({
        themeType: 'custom',
        themeId: 'custom',
        customTheme: {
          background: 'javascript:alert(1)', // Malicious
          outgoingBubble: '#10b981',
          incomingBubble: 'rgba(255, 255, 255, 0.9)',
          wallpaper: 'javascript:stealToken()', // Malicious
          wallpaperOpacity: 15, // Below 20 min
        },
      }),
    });
    const customData = await customRes.json();
    assert(customRes.status === 200, 'Custom theme accepted after sanitization');
    assert(customData.theme.customTheme.background === '#ffffff', 'Malicious CSS background sanitized to fallback');
    assert(customData.theme.customTheme.wallpaper === '', 'Malicious javascript: wallpaper URL stripped');
    assert(customData.theme.customTheme.wallpaperOpacity === 20, 'Wallpaper opacity bounded to minimum 20%');

    console.log('\n--- Phase 6: Reset Theme to Default ---');
    const resetRes = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      method: 'DELETE',
      headers: headersA,
    });
    const resetData = await resetRes.json();
    assert(resetRes.status === 200, 'Alice reset theme returned 200');
    assert(resetData.isDefault === true, 'Reset confirmed isDefault = true');

    const afterResetGet = await fetch(`${BASE_URL}/api/conversations/${conversation._id}/theme`, {
      headers: headersA,
    });
    const afterResetData = await afterResetGet.json();
    assert(afterResetData.isDefault === true && afterResetData.theme === null, 'Alice theme verified reset to default');

    console.log('\n--- Phase 7: Theme Preferences & Favorites ---');
    const favRes = await fetch(`${BASE_URL}/api/conversations/theme-favorites`, {
      method: 'PUT',
      headers: headersA,
      body: JSON.stringify({ themeId: 'midnight' }),
    });
    const favData = await favRes.json();
    assert(favRes.status === 200 && favData.favorites.includes('midnight'), 'Favorite theme toggled on');

    const prefRes = await fetch(`${BASE_URL}/api/conversations/theme-preferences`, {
      headers: headersA,
    });
    const prefData = await prefRes.json();
    assert(prefData.favorites.includes('midnight'), 'Preferences return saved favorites');

    console.log('\n============================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runThemeTests();
