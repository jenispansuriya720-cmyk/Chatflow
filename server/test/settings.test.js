require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

const runSettingsTests = async () => {
  console.log('\n=============================================================');
  console.log('⚙️   CHATFLOW COMPREHENSIVE SETTINGS CENTER TEST SUITE');
  console.log('=============================================================\n');

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

  try {
    const ts = Date.now();

    // 1. Register User A & User B
    console.log('--- Step 1: Register Test Accounts ---');
    const userARes = await req('/auth/register', 'POST', {
      fullName: 'Alice Settings',
      username: `alice_set_${ts}`,
      email: `alice_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    assert(userARes.status === 201 && userARes.data.success, 'User A registered');
    const tokenA = userARes.data.token;
    const userIdA = userARes.data.user._id;

    const userBRes = await req('/auth/register', 'POST', {
      fullName: 'Bob Settings',
      username: `bob_set_${ts}`,
      email: `bob_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    assert(userBRes.status === 201 && userBRes.data.success, 'User B registered');
    const tokenB = userBRes.data.token;
    const userIdB = userBRes.data.user._id;

    // 2. Fetch User A Settings (Default initialization)
    console.log('\n--- Step 2: Auto-Create Default Settings ---');
    const getResA = await req('/settings', 'GET', null, tokenA);
    assert(getResA.status === 200 && getResA.data.success, 'Default settings returned');
    assert(getResA.data.settings.userId === userIdA, 'Settings attached to User A');
    assert(getResA.data.settings.privacy.accountPrivacy === 'public', 'Default privacy is public');
    assert(getResA.data.settings.appearance.theme === 'dark', 'Default theme is dark');
    assert(getResA.data.settings.security.twoFactorEnabled === false, '2FA disabled by default');
    assert(
      Array.isArray(getResA.data.settings.connectedApps) &&
        getResA.data.settings.connectedApps.length > 0,
      'Default connected apps seeded'
    );

    // 3. Update Multi-category Settings
    console.log('\n--- Step 3: Multi-Category Settings Patch ---');
    const patchRes = await req(
      '/settings',
      'PATCH',
      {
        privacy: {
          accountPrivacy: 'private',
          messagePermission: 'connections',
          onlineStatus: false,
        },
        appearance: {
          theme: 'light',
          accentColor: 'emerald',
          layoutDensity: 'compact',
        },
        messages: {
          readReceipts: false,
          enterKeySends: true,
          mediaAutoDownload: 'never',
        },
      },
      tokenA
    );
    assert(patchRes.status === 200 && patchRes.data.success, 'Settings patched successfully');
    assert(patchRes.data.settings.privacy.accountPrivacy === 'private', 'Privacy updated to private');
    assert(patchRes.data.settings.appearance.accentColor === 'emerald', 'Accent color updated');
    assert(patchRes.data.settings.messages.mediaAutoDownload === 'never', 'Media download updated');

    // 4. Verify Sync with User model
    console.log('\n--- Step 4: Verification of Sync with User Model ---');
    const userFetch = await req(`/users/${userIdA}`, 'GET', null, tokenA);
    assert(userFetch.status === 200 && userFetch.data.user.isPrivate === true, 'User isPrivate synced with settings');

    // 5. Section Specific Updates
    console.log('\n--- Step 5: Granular Section Updates ---');
    const notifPatch = await req(
      '/settings/notifications',
      'PATCH',
      {
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
      },
      tokenA
    );
    assert(notifPatch.status === 200 && notifPatch.data.data.quietHoursEnabled === true, 'Notifications section updated');

    const aiPatch = await req(
      '/settings/ai',
      'PATCH',
      {
        conversationSummaries: false,
        useChatsForPersonalization: false,
      },
      tokenA
    );
    assert(aiPatch.status === 200 && aiPatch.data.data.conversationSummaries === false, 'AI section updated');

    // 6. Two-Factor Authentication (2FA) & Recovery Codes
    console.log('\n--- Step 6: Two-Factor Authentication Flow ---');
    // Attempt with incorrect password
    const bad2FA = await req(
      '/settings/security/2fa',
      'POST',
      { enabled: true, method: 'authenticator', password: 'WrongPassword!' },
      tokenA
    );
    assert(bad2FA.status === 401, 'Rejected 2FA change with wrong password');

    // Enable 2FA with valid credentials
    const enable2FA = await req(
      '/settings/security/2fa',
      'POST',
      { enabled: true, method: 'authenticator', password: 'Password123!' },
      tokenA
    );
    assert(enable2FA.status === 200 && enable2FA.data.twoFactorEnabled === true, '2FA enabled');
    assert(
      Array.isArray(enable2FA.data.recoveryCodes) && enable2FA.data.recoveryCodes.length === 8,
      '8 recovery codes generated'
    );
    assert(enable2FA.data.recoveryCodes[0].startsWith('CF-'), 'Recovery codes match CF-XXXX-XXXX format');

    // Disable 2FA
    const disable2FA = await req(
      '/settings/security/2fa',
      'POST',
      { enabled: false, password: 'Password123!' },
      tokenA
    );
    assert(disable2FA.status === 200 && disable2FA.data.twoFactorEnabled === false, '2FA disabled successfully');

    // 7. Revoke Connected App
    console.log('\n--- Step 7: Revoke Connected App ---');
    const revokeRes = await req(
      '/settings/connected-apps/revoke',
      'POST',
      { appId: 'github-oauth' },
      tokenA
    );
    assert(revokeRes.status === 200 && revokeRes.data.success, 'Connected app revoked');
    const hasGithub = revokeRes.data.connectedApps.some((a) => a.appId === 'github-oauth');
    assert(!hasGithub, 'GitHub app no longer present in connected apps list');

    // 8. Clear AI History & Client Media Cache
    console.log('\n--- Step 8: Clear AI History & Cache ---');
    const clearAi = await req('/settings/ai/clear-history', 'POST', {}, tokenA);
    assert(clearAi.status === 200 && clearAi.data.success, 'AI history cleared');

    const clearCacheRes = await req('/settings/data/clear-cache', 'POST', {}, tokenA);
    assert(
      clearCacheRes.status === 200 && clearCacheRes.data.cachedMediaBytes === 0,
      'Cache cleared (0 bytes)'
    );

    // 9. Authorization & Isolation
    console.log('\n--- Step 9: Cross-User Authorization & Isolation ---');
    // Unauthorized access
    const noToken = await req('/settings', 'GET', null, null);
    assert(noToken.status === 401, 'Unauthenticated access rejected (401)');

    // User B's settings are completely separate from User A
    const getResB = await req('/settings', 'GET', null, tokenB);
    assert(getResB.status === 200, 'User B settings fetched');
    assert(getResB.data.settings.userId === userIdB, "User B receives own settings");
    assert(getResB.data.settings.privacy.accountPrivacy === 'public', "User B retains public privacy independently of User A");

    // 10. Account Deactivation
    console.log('\n--- Step 10: Account Deactivation Workflow ---');
    const badDeact = await req(
      '/settings/account/deactivate',
      'POST',
      { password: 'WrongPassword' },
      tokenA
    );
    assert(badDeact.status === 401, 'Deactivation rejected with wrong password');

    const goodDeact = await req(
      '/settings/account/deactivate',
      'POST',
      { password: 'Password123!', reason: 'Taking a digital detox' },
      tokenA
    );
    assert(goodDeact.status === 200 && goodDeact.data.success, 'Account temporarily deactivated');

    console.log('\n=============================================================');
    console.log(`📊 SETTINGS TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
};

runSettingsTests();
