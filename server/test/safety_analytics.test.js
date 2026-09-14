require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

const runSafetyAnalyticsTests = async () => {
  console.log('\n=============================================================');
  console.log('🛡️  CHATFLOW SAFETY, PRIVACY & CREATOR ANALYTICS TEST SUITE');
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

    // 1. Register test user
    console.log('--- Step 1: Register Creator Account ---');
    const regRes = await req('/auth/register', 'POST', {
      fullName: 'Safety Tester',
      username: `safety_${ts}`,
      email: `safety_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    assert(regRes.status === 201 && regRes.data.success, 'Test user registered');
    const token = regRes.data.token;
    const userId = regRes.data.user._id;

    // 2. Submit a report (Section 20)
    console.log('\n--- Step 2: Content & User Reporting ---');
    const reportRes = await req(
      '/reports',
      'POST',
      {
        targetType: 'post',
        targetId: userId, // self id as sample target
        category: 'spam',
        details: 'Automated test report for promotional spam.',
      },
      token
    );
    assert(reportRes.status === 201 && reportRes.data.success, 'Report submitted successfully');
    assert(
      reportRes.data.message === 'Report submitted. Thank you for helping keep ChatFlow safe.',
      'Report confirmation message matches Section 20'
    );

    // 3. Fetch report history (Section 19)
    const historyRes = await req('/reports/history', 'GET', null, token);
    assert(historyRes.status === 200 && historyRes.data.success, 'Fetched report history');
    assert(historyRes.data.reports?.length >= 1, 'Report appears in user report history');
    assert(historyRes.data.reports[0].category === 'spam', 'Report category stored accurately');

    // 4. Update granular privacy settings (Section 22)
    console.log('\n--- Step 3: Granular Privacy Controls ---');
    const privRes = await req(
      '/users/privacy/settings',
      'PUT',
      {
        isPrivate: true,
        messagePermissions: 'followers',
        storyAudience: 'followers',
        onlineStatusVisibility: 'nobody',
        lastSeenVisibility: 'nobody',
      },
      token
    );
    assert(privRes.status === 200 && privRes.data.success, 'Privacy settings updated');
    assert(privRes.data.isPrivate === true, 'isPrivate set to true');
    assert(privRes.data.privacySettings?.messagePermissions === 'followers', 'messagePermissions updated');
    assert(privRes.data.privacySettings?.onlineStatusVisibility === 'nobody', 'onlineStatusVisibility updated');

    // 5. Update safety controls (mute, restrict, hidden words) (Section 14 & 19)
    console.log('\n--- Step 4: Safety Controls (Mute, Restrict, Hidden Words) ---');
    const wordRes = await req(
      '/users/safety/controls',
      'POST',
      { action: 'add_word', word: 'freecrypto' },
      token
    );
    assert(wordRes.status === 200 && wordRes.data.success, 'Hidden word added');
    assert(wordRes.data.hiddenWords?.includes('freecrypto'), 'Word saved in hiddenWords filter');

    const summaryRes = await req('/users/safety/summary', 'GET', null, token);
    assert(summaryRes.status === 200 && summaryRes.data.success, 'Fetched safety summary');
    assert(summaryRes.data.safety?.hiddenWords?.includes('freecrypto'), 'Hidden word present in safety summary');

    // 6. Download My Data export (Section 38)
    console.log('\n--- Step 5: Download My Data Export ---');
    const exportRes = await req('/users/export-data', 'GET', null, token);
    assert(exportRes.status === 200, 'Data export endpoint returned 200 OK');
    assert(exportRes.data.platform === 'ChatFlow', 'Export package contains platform identifier');
    assert(exportRes.data.account?.username === `safety_${ts}`, 'Export package contains user account data');
    assert(Array.isArray(exportRes.data.posts), 'Export package includes posts array');
    assert(Array.isArray(exportRes.data.reels), 'Export package includes reels array');

    // 7. Creator Analytics (Section 32 & 33)
    console.log('\n--- Step 6: Creator Analytics ---');
    const analyticsRes = await req('/users/creator/analytics', 'GET', null, token);
    assert(analyticsRes.status === 200 && analyticsRes.data.success, 'Creator analytics returned');
    assert(typeof analyticsRes.data.analytics?.views === 'number', 'Views count computed');
    assert(typeof analyticsRes.data.analytics?.reach === 'number', 'Reach count computed');
    assert(typeof analyticsRes.data.analytics?.engagement === 'number', 'Engagement count computed');
    assert(Array.isArray(analyticsRes.data.analytics?.topPosts), 'Top posts breakdown included');

    console.log('\n=============================================================');
    console.log(`🎉 TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log('=============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test exception:', err);
    process.exit(1);
  }
};

runSafetyAnalyticsTests();
