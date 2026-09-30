const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const { connectDB, disconnectDB } = require('../config/db');
const { app, server } = require('../server');
const User = require('../models/User');
const Post = require('../models/Post');

// Helper to make HTTP requests against the test server
const makeRequest = (serverPort, method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: serverPort,
        path,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch (e) {
            parsed = body;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

const runDirectAuthTests = async () => {
  console.log('\n========================================');
  console.log('🧪 CHATFLOW DIRECT AUTHENTICATION TEST SUITE (ZERO SMTP)');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? '- ' + details : ''}`);
      failed++;
    }
  };

  const TEST_PORT = 5099;
  let testServer;

  try {
    await connectDB();

    // Clean test accounts
    await User.deleteMany({ email: /.*test_direct_auth.*@example\.com/ });

    // Start server on dedicated test port
    await new Promise((resolve) => {
      testServer = server.listen(TEST_PORT, () => {
        console.log(`[Test Server] Listening on http://127.0.0.1:${TEST_PORT}`);
        resolve();
      });
    });

    const userEmail = `user_test_direct_auth_${Date.now()}@example.com`;
    const username = `authuser_${Date.now().toString().slice(-6)}`;
    const originalPassword = 'SecurePassword123!';
    const updatedPassword = 'NewSecurePassword456!';
    let authToken = null;
    let registeredUserId = null;

    // ----------------------------------------------------
    // TEST 1: Direct Registration (Immediate JWT, No SMTP)
    // ----------------------------------------------------
    console.log('\n[Group 1: Registration & Immediate Session]');
    const regRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/register', {
      fullName: 'Direct Auth Tester',
      username,
      email: userEmail,
      password: originalPassword,
      confirmPassword: originalPassword,
    });

    assert(regRes.status === 201, 'Registration returns 201 Created', `Got ${regRes.status}`);
    assert(regRes.body.success === true, 'Registration reports success: true');
    assert(regRes.body.token != null, 'Registration returns JWT token immediately without email verification');
    assert(regRes.body.requiresVerification === undefined, 'No requiresVerification flag in response');
    assert(regRes.body.user != null && regRes.body.user.email === userEmail, 'Returned user matches registered email');
    authToken = regRes.body.token;
    registeredUserId = regRes.body.user._id;

    // Verify DB fields: no emailVerificationTokenHash or emailVerificationExpires
    const dbUser = await User.findById(registeredUserId);
    assert(dbUser != null, 'User document persisted in database');
    assert(dbUser.emailVerificationTokenHash === undefined, 'No emailVerificationTokenHash stored in DB');
    assert(dbUser.emailVerificationExpires === undefined, 'No emailVerificationExpires stored in DB');

    // ----------------------------------------------------
    // TEST 2: Duplicate Account Handling
    // ----------------------------------------------------
    console.log('\n[Group 2: Duplicate Account Handling]');
    const dupRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/register', {
      fullName: 'Duplicate Tester',
      username: username + '_other',
      email: userEmail,
      password: originalPassword,
    });
    assert(dupRes.status === 400, 'Duplicate email registration rejected with 400 Bad Request');
    assert(dupRes.body.success === false, 'Duplicate response indicates failure');

    const dupUserRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/register', {
      fullName: 'Duplicate User Tester',
      username,
      email: 'another_' + userEmail,
      password: originalPassword,
    });
    assert(dupUserRes.status === 400, 'Duplicate username registration rejected with 400 Bad Request');

    // ----------------------------------------------------
    // TEST 3: Login Handling (Valid & Invalid Credentials)
    // ----------------------------------------------------
    console.log('\n[Group 3: Login Handling]');
    // 3a. Invalid credentials
    const badLoginRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      loginId: userEmail,
      password: 'WrongPassword999!',
    });
    assert(badLoginRes.status === 401, 'Invalid password rejected with 401 Unauthorized');

    const badUserRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      loginId: 'nonexistent_user_999@example.com',
      password: 'AnyPassword123!',
    });
    assert(badUserRes.status === 401, 'Nonexistent user rejected with 401 Unauthorized');

    // 3b. Valid login with email
    const goodLoginEmail = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      loginId: userEmail,
      password: originalPassword,
    });
    assert(goodLoginEmail.status === 200, 'Login with email returns 200 OK');
    assert(goodLoginEmail.body.token != null, 'Login returns valid session JWT token');
    assert(goodLoginEmail.body.user != null, 'Login returns user object');

    // 3c. Valid login with username
    const goodLoginUser = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      loginId: username,
      password: originalPassword,
    });
    assert(goodLoginUser.status === 200, 'Login with username returns 200 OK');

    // ----------------------------------------------------
    // TEST 4: Session & JWT Handling / Protected Routes
    // ----------------------------------------------------
    console.log('\n[Group 4: Protected Routes & JWT Handling]');
    // 4a. Authenticated access to /api/auth/me
    const meRes = await makeRequest(TEST_PORT, 'GET', '/api/auth/me', null, authToken);
    assert(meRes.status === 200, 'GET /api/auth/me with valid JWT returns 200 OK');
    assert(meRes.body.user._id === registeredUserId, 'GET /api/auth/me returns current user');

    // 4b. Unauthorized requests
    const unauthRes = await makeRequest(TEST_PORT, 'GET', '/api/auth/me');
    assert(unauthRes.status === 401, 'GET /api/auth/me without token rejected with 401');

    const invalidTokenRes = await makeRequest(TEST_PORT, 'GET', '/api/auth/me', null, 'invalid_fake_token_jwt');
    assert(invalidTokenRes.status === 401, 'GET /api/auth/me with malformed token rejected with 401');

    // ----------------------------------------------------
    // TEST 5: Direct Password Change
    // ----------------------------------------------------
    console.log('\n[Group 5: Direct Password Change]');
    // 5a. Bad current password
    const badPwRes = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/auth/change-password',
      {
        currentPassword: 'IncorrectPassword!',
        newPassword: updatedPassword,
        confirmPassword: updatedPassword,
      },
      authToken
    );
    assert(badPwRes.status === 400, 'Password change with wrong current password rejected with 400');

    // 5b. Successful password change (no email dispatch required)
    const goodPwRes = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/auth/change-password',
      {
        currentPassword: originalPassword,
        newPassword: updatedPassword,
        confirmPassword: updatedPassword,
      },
      authToken
    );
    assert(goodPwRes.status === 200, 'Password change succeeds with 200 OK without SMTP');

    // 5c. Login with new password
    const newLoginRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      loginId: userEmail,
      password: updatedPassword,
    });
    assert(newLoginRes.status === 200, 'Login with new updated password succeeds');
    const newAuthToken = newLoginRes.body.token;

    // ----------------------------------------------------
    // TEST 6: Direct Account Deletion (Cascading Cleanup)
    // ----------------------------------------------------
    console.log('\n[Group 6: Direct Account Deletion]');
    // Create dummy post to test cascading cleanup
    await Post.create({
      author: registeredUserId,
      content: 'This post will be cascaded on account deletion',
    });

    // 6a. Delete with wrong password
    const badDelRes = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/auth/delete-account',
      { password: 'WrongPassword!' },
      newAuthToken
    );
    assert(badDelRes.status === 401, 'Account deletion with incorrect password rejected with 401');

    // 6b. Delete with valid password
    const goodDelRes = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/auth/delete-account',
      { password: updatedPassword },
      newAuthToken
    );
    assert(goodDelRes.status === 200, 'Account deletion succeeds with 200 OK');

    // 6c. Verify DB cleanup
    const deletedUser = await User.findById(registeredUserId);
    assert(deletedUser === null, 'User document permanently removed from database');
    const userPosts = await Post.find({ author: registeredUserId });
    assert(userPosts.length === 0, 'Associated user posts cascade-deleted');

    // 6d. Verify subsequent login fails
    const postDelLogin = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      loginId: userEmail,
      password: updatedPassword,
    });
    assert(postDelLogin.status === 401, 'Deleted user cannot log in');

    // ----------------------------------------------------
    // TEST 7: Logout
    // ----------------------------------------------------
    console.log('\n[Group 7: Logout]');
    // Create another quick user to test logout
    const logoutUserRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/register', {
      fullName: 'Logout Tester',
      username: 'logoutuser_' + Date.now().toString().slice(-6),
      email: 'logout_' + Date.now() + '@example.com',
      password: 'LogoutPassword123!',
    });
    const logoutToken = logoutUserRes.body.token;
    const logoutRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/logout', null, logoutToken);
    assert(logoutRes.status === 200, 'Logout succeeds with 200 OK');

    // ----------------------------------------------------
    // TEST 8: Verify Removed SMTP Endpoints Return 404
    // ----------------------------------------------------
    console.log('\n[Group 8: Verification of Removed SMTP Endpoints (404 Not Found)]');
    const verifyEmailRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/verify-email', { token: '123' });
    assert(verifyEmailRes.status === 404, 'POST /api/auth/verify-email is removed (404 Not Found)');

    const resendRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/resend-verification', { email: 'a@b.com' });
    assert(resendRes.status === 404, 'POST /api/auth/resend-verification is removed (404 Not Found)');

    const forgotRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/forgot-password', { email: 'a@b.com' });
    assert(forgotRes.status === 404, 'POST /api/auth/forgot-password is removed (404 Not Found)');

    const resetRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/reset-password', { token: '123', newPassword: 'p' });
    assert(resetRes.status === 404, 'POST /api/auth/reset-password is removed (404 Not Found)');

    const testSmtpRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/test-smtp', { to: 'a@b.com' });
    assert(testSmtpRes.status === 404, 'POST /api/auth/test-smtp is removed (404 Not Found)');

    const devEmailRes = await makeRequest(TEST_PORT, 'POST', '/api/dev/test-email', { email: 'a@b.com' });
    assert(devEmailRes.status === 404, 'POST /api/dev/test-email is removed (404 Not Found)');

  } catch (err) {
    console.error('💥 Test suite runtime exception:', err);
    failed++;
  } finally {
    if (testServer) {
      testServer.close();
    }
    await disconnectDB();

    console.log('\n========================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
};

runDirectAuthTests();
