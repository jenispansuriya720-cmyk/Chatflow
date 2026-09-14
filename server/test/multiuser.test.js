require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

const runMultiUserScenario = async () => {
  console.log('\n======================================================');
  console.log('🚀 CHATFLOW MULTI-USER INTEGRATION TEST (SECTION 110)');
  console.log('======================================================\n');

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

    // ----------------------------------------------------
    // STEP 1: Registration of Users A, B, and C
    // ----------------------------------------------------
    console.log('--- Step 1: Register Users A, B, and C ---');
    const userAData = {
      fullName: 'Alex Rivers',
      username: `alex_${ts}`,
      email: `alex_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    const userBData = {
      fullName: 'Sarah Connor',
      username: `sarah_${ts}`,
      email: `sarah_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    const userCData = {
      fullName: 'Marcus Vance',
      username: `marcus_${ts}`,
      email: `marcus_${ts}@chatflow.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    const regA = await req('/auth/register', 'POST', userAData);
    assert(regA.status === 201 && regA.data.success, 'User A registered successfully', regA.data?.user?.username);
    const tokenA = regA.data.token;
    const userAId = regA.data.user._id;
    assert(regA.data.user.isOnboarded === false, 'User A initial isOnboarded is false');

    const regB = await req('/auth/register', 'POST', userBData);
    assert(regB.status === 201 && regB.data.success, 'User B registered successfully', regB.data?.user?.username);
    const tokenB = regB.data.token;
    const userBId = regB.data.user._id;

    const regC = await req('/auth/register', 'POST', userCData);
    assert(regC.status === 201 && regC.data.success, 'User C registered successfully', regC.data?.user?.username);
    const tokenC = regC.data.token;
    const userCId = regC.data.user._id;

    // ----------------------------------------------------
    // STEP 2: User A Completes Onboarding
    // ----------------------------------------------------
    console.log('\n--- Step 2: User A Profile Onboarding ---');
    const onboardA = await req(
      '/users/onboarding',
      'POST',
      {
        bio: 'Full-stack builder passionate about real-time UX',
        interests: ['JavaScript', 'React', 'Design', 'AI'],
      },
      tokenA
    );
    assert(onboardA.status === 200 && onboardA.data.success, 'User A completed onboarding');
    assert(onboardA.data.user?.isOnboarded === true, 'User A isOnboarded flag set to true');
    assert(onboardA.data.user?.interests?.length === 4, 'User A interests saved', `${onboardA.data.user?.interests?.join(', ')}`);

    // ----------------------------------------------------
    // STEP 3: User A Sets Account to Private
    // ----------------------------------------------------
    console.log('\n--- Step 3: User A Privacy Settings ---');
    const privacyA = await req('/users/privacy', 'PUT', {}, tokenA);
    assert(privacyA.status === 200 && privacyA.data.success, 'User A toggled privacy');
    assert(privacyA.data.isPrivate === true, 'User A account is now private');

    // ----------------------------------------------------
    // STEP 4: User B Discovers User A via Search
    // ----------------------------------------------------
    console.log('\n--- Step 4: User B Discovers User A ---');
    const searchRes = await req(`/users?search=alex_${ts}`, 'GET', null, tokenB);
    assert(searchRes.status === 200 && searchRes.data.success, 'User search succeeded');
    const foundA = searchRes.data.users?.find((u) => u._id === userAId);
    assert(foundA != null, 'User B found User A by username search');

    // ----------------------------------------------------
    // STEP 5: Relationship State Verification & Request
    // ----------------------------------------------------
    console.log('\n--- Step 5: Follow Request & Relationship State ---');
    const relInitial = await req(`/follow/${userAId}/relationship`, 'GET', null, tokenB);
    assert(relInitial.data?.relationship === 'none', 'Initial relationship between B and A is none');

    // User B sends follow request to User A (who is private)
    const followReq = await req(`/follow/${userAId}`, 'POST', {}, tokenB);
    assert(followReq.status === 200 && followReq.data.success, 'Follow request sent to private account');
    assert(followReq.data.status === 'pending', 'Follow relationship status is pending');
    assert(followReq.data.isFollowing === false, 'isFollowing is false until approved');

    // Relationship check should now return 'requested'
    const relRequested = await req(`/follow/${userAId}/relationship`, 'GET', null, tokenB);
    assert(relRequested.data?.relationship === 'requested', 'User B relationship state is requested');

    // ----------------------------------------------------
    // STEP 6: User A Receives Request & Notification
    // ----------------------------------------------------
    console.log('\n--- Step 6: User A Follow Request Review ---');
    const pendingReqs = await req('/follow/requests', 'GET', null, tokenA);
    assert(pendingReqs.status === 200 && pendingReqs.data.success, 'User A fetched pending requests');
    const bInPending = pendingReqs.data.requests?.find((r) => r.follower?._id === userBId);
    assert(bInPending != null, 'User B found in User A pending follow requests list');

    const notifsA = await req('/notifications', 'GET', null, tokenA);
    assert(notifsA.status === 200 && notifsA.data.success, 'User A fetched notifications');
    const followNotif = notifsA.data.notifications?.find(
      (n) => n.type === 'follow_request' && n.sender?._id === userBId
    );
    assert(followNotif != null, 'User A received follow_request notification from User B');

    // ----------------------------------------------------
    // STEP 7: User A Accepts User B's Request
    // ----------------------------------------------------
    console.log('\n--- Step 7: User A Accepts User B ---');
    const acceptRes = await req(`/follow/${userBId}/accept`, 'POST', {}, tokenA);
    assert(acceptRes.status === 200 && acceptRes.data.success, 'User A accepted follow request');

    // Verify relationship states
    const relBtoA = await req(`/follow/${userAId}/relationship`, 'GET', null, tokenB);
    assert(relBtoA.data?.relationship === 'following', 'User B is now following User A');

    const relAtoB = await req(`/follow/${userBId}/relationship`, 'GET', null, tokenA);
    assert(relAtoB.data?.relationship === 'follower', 'User A sees User B as follower');

    // Verify counters
    const profileA = await req(`/users/${userAId}`, 'GET', null, tokenB);
    assert(profileA.data.user?.followersCount === 1, 'User A followers count is 1');
    const profileB = await req(`/users/${userBId}`, 'GET', null, tokenB);
    assert(profileB.data.user?.followingCount === 1, 'User B following count is 1');

    // ----------------------------------------------------
    // STEP 8: 1-to-1 Direct Messaging Between B and A
    // ----------------------------------------------------
    console.log('\n--- Step 8: 1-to-1 Direct Messaging ---');
    const convRes = await req('/conversations/direct', 'POST', { recipientId: userAId }, tokenB);
    assert(convRes.status === 200 && convRes.data.success, '1-on-1 direct conversation initialized');
    const convId = convRes.data.conversation._id;
    assert(
      convRes.data.conversation.participants.some((p) => p._id === userAId) &&
        convRes.data.conversation.participants.some((p) => p._id === userBId),
      'Conversation includes both User A and User B'
    );

    // User B sends message
    const msgRes = await req(
      '/messages',
      'POST',
      {
        conversationId: convId,
        text: 'Hi Alex, happy to connect on ChatFlow!',
      },
      tokenB
    );
    assert(msgRes.status === 201 && msgRes.data.success, 'Direct message dispatched by User B');
    assert(
      (msgRes.data.message?.text || msgRes.data.message?.content) ===
        'Hi Alex, happy to connect on ChatFlow!',
      'Message text stored accurately'
    );

    // User A reads conversation messages
    const msgsA = await req(`/messages/${convId}`, 'GET', null, tokenA);
    assert(msgsA.status === 200 && msgsA.data.success, 'User A fetched conversation history');
    assert(msgsA.data.messages?.length >= 1, 'User A sees User B message in history');

    // ----------------------------------------------------
    // STEP 9: Posts & Stories Privacy / Data Isolation
    // ----------------------------------------------------
    console.log('\n--- Step 9: Social Posts, Stories & Data Isolation ---');
    // User A creates a post
    const postRes = await req(
      '/posts',
      'POST',
      {
        content: 'Exclusive post for my approved followers! #chatflow #tech',
      },
      tokenA
    );
    assert(postRes.status === 201 && postRes.data.success, 'User A created a post');
    const postId = postRes.data.post._id;

    // User A creates a story
    const storyRes = await req(
      '/stories',
      'POST',
      {
        media: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675',
        text: 'Behind the scenes at ChatFlow',
      },
      tokenA
    );
    assert(storyRes.status === 201 && storyRes.data.success, 'User A created a story');

    // User B (approved follower) checks feed
    const feedB = await req('/posts/feed', 'GET', null, tokenB);
    const postFoundB = feedB.data.posts?.some((p) => p._id === postId);
    assert(postFoundB === true, 'User B (follower) CAN view User A private post');

    // User C (non-follower) checks feed
    const feedC = await req('/posts/feed', 'GET', null, tokenC);
    const postFoundC = feedC.data.posts?.some((p) => p._id === postId);
    assert(postFoundC === false, 'User C (non-follower) CANNOT view User A private post (Data Isolation)');

    // Story isolation check:
    const storiesB = await req('/stories', 'GET', null, tokenB);
    const storyFoundB = storiesB.data.storyGroups?.some((g) => g.user?._id === userAId);
    assert(storyFoundB === true, 'User B (follower) CAN view User A private stories');

    const storiesC = await req('/stories', 'GET', null, tokenC);
    const storyFoundC = storiesC.data.storyGroups?.some((g) => g.user?._id === userAId);
    assert(storyFoundC === false, 'User C (non-follower) CANNOT view User A private stories (Data Isolation)');

    // ----------------------------------------------------
    // STEP 10: Interaction (User B Likes User A's Post)
    // ----------------------------------------------------
    console.log('\n--- Step 10: Post Interactions ---');
    const likeRes = await req(`/posts/${postId}/like`, 'POST', {}, tokenB);
    assert(likeRes.status === 200 && likeRes.data.success, 'User B liked User A post');
    assert(likeRes.data.isLiked === true && likeRes.data.likesCount === 1, 'Post likes count updated');

    // ----------------------------------------------------
    // STEP 11: Story Viewer Tracking (Section 89)
    // ----------------------------------------------------
    console.log('\n--- Step 11: Story Viewer Tracking ---');
    const storyId = storyRes.data.story._id;
    const viewRes = await req(`/stories/${storyId}/view`, 'POST', {}, tokenB);
    assert(viewRes.status === 200 && viewRes.data.success, 'User B recorded as viewing User A story');
    assert(viewRes.data.viewersCount >= 1, 'Story viewers count incremented');

    const viewersRes = await req(`/stories/${storyId}/viewers`, 'GET', null, tokenA);
    assert(viewersRes.status === 200 && viewersRes.data.success, 'User A fetched story viewers list');
    const bInViewers = viewersRes.data.viewers?.some(
      (v) => (v.user?._id || v.user)?.toString() === userBId.toString()
    );
    assert(bInViewers === true, 'User B appears with profile in User A story viewers drawer');

    // ----------------------------------------------------
    // STEP 12: Two-Way Connection System (Section 84 & 88)
    // ----------------------------------------------------
    console.log('\n--- Step 12: Two-Way Connection Request & Acceptance ---');
    // Initial status between B and C is none
    const initConnStatus = await req(`/connections/status/${userCId}`, 'GET', null, tokenB);
    assert(initConnStatus.data?.status === 'none', 'Initial connection status between B and C is none');

    // User B sends connection request to User C
    const sendConn = await req(`/connections/request/${userCId}`, 'POST', {}, tokenB);
    assert(sendConn.status === 200 && sendConn.data.success, 'User B sent connection request to User C');

    // User C checks pending connection requests
    const pendConns = await req('/connections/pending', 'GET', null, tokenC);
    assert(pendConns.status === 200 && pendConns.data.success, 'User C fetched pending connection requests');
    const bConnReq = pendConns.data.requests?.find(
      (r) => (r.requester?._id || r.requester)?.toString() === userBId.toString()
    );
    assert(bConnReq != null, 'User B request visible in User C pending connection requests');

    // User C accepts connection request
    const acceptConn = await req(`/connections/accept/${userBId}`, 'POST', {}, tokenC);
    assert(acceptConn.status === 200 && acceptConn.data.success, 'User C accepted connection request from User B');

    // Verify mutual connection status
    const statusBtoC = await req(`/connections/status/${userCId}`, 'GET', null, tokenB);
    assert(statusBtoC.data?.status === 'connected', 'Connection status between B and C is now connected');

    const listConnsB = await req('/connections', 'GET', null, tokenB);
    const cInB = listConnsB.data.connections?.some(
      (c) => (c.user?._id || c.user)?.toString() === userCId.toString()
    );
    assert(cInB === true, 'User C listed in User B mutual connections');

    // ----------------------------------------------------
    // STEP 13: Live Streaming Broadcast & Discovery
    // ----------------------------------------------------
    console.log('\n--- Step 13: Live Broadcast Session ---');
    const liveRes = await req(
      '/live',
      'POST',
      { title: 'ChatFlow Architecture & Real-Time Demo', description: 'Testing multi-user live streams' },
      tokenB
    );
    assert(liveRes.status === 201 && liveRes.data.success, 'User B started live stream broadcast');
    const streamId = liveRes.data.stream._id;

    // User C discovers live streams
    const activeStreams = await req('/live', 'GET', null, tokenC);
    assert(activeStreams.status === 200 && activeStreams.data.success, 'User C fetched active live streams');
    const streamFound = activeStreams.data.streams?.some((s) => s._id.toString() === streamId.toString());
    assert(streamFound === true, 'User B live broadcast discovered by User C');

    // User C joins stream
    const joinRes = await req(`/live/${streamId}/join`, 'POST', {}, tokenC);
    assert(joinRes.status === 200 && joinRes.data.success, 'User C joined User B live stream');

    // User B ends stream
    const endRes = await req(`/live/${streamId}/end`, 'POST', {}, tokenB);
    assert(endRes.status === 200 && endRes.data.success, 'User B ended live stream broadcast');

    // ----------------------------------------------------
    // STEP 14: Multi-Device Sessions & Logout
    // ----------------------------------------------------
    console.log('\n--- Step 14: Active Sessions & Multi-Device Security ---');
    const sessRes = await req('/users/sessions', 'GET', null, tokenA);
    assert(sessRes.status === 200 && sessRes.data.success, 'User A fetched active sessions');
    assert(Array.isArray(sessRes.data.sessions), 'Sessions array returned');

    const logoutSess = await req('/users/sessions', 'DELETE', {}, tokenA);
    assert(logoutSess.status === 200 && logoutSess.data.success, 'User A logged out all other sessions');

    // ----------------------------------------------------
    // STEP 15: Account Deletion with Cascade Cleanup
    // ----------------------------------------------------
    console.log('\n--- Step 15: Account Deletion & Cleanup ---');
    // Wrong password check
    const badDel = await req('/users/account', 'DELETE', { password: 'WrongPassword' }, tokenA);
    assert(badDel.status === 400 || badDel.status === 401, 'Deletion rejected with incorrect password');

    // Correct password deletion
    const delRes = await req('/users/account', 'DELETE', { password: 'Password123!' }, tokenA);
    assert(delRes.status === 200 && delRes.data.success, 'User A account permanently deleted');

    // Verification: User A cannot log in anymore
    const loginA = await req('/auth/login', 'POST', {
      loginId: userAData.email,
      password: userAData.password,
    });
    assert(loginA.status === 401, 'User A login rejected after account deletion');

    console.log('\n======================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test exception:', err);
    process.exit(1);
  }
};

runMultiUserScenario();
