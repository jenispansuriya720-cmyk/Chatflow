const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function registerOrLogin(user) {
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId: user.email, password: user.password }),
  });
  if (loginRes.data.success) {
    return { token: loginRes.data.token, user: loginRes.data.user };
  }

  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(user),
  });
  if (regRes.data.success) {
    return { token: regRes.data.token, user: regRes.data.user };
  }
  throw new Error(`Failed to auth user ${user.username}: ${JSON.stringify(regRes.data)}`);
}

async function runTest() {
  console.log('=== RUNNING CHATFLOW STORY FOLLOWING-ONLY VERIFICATION TEST ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Setup User A, User B, User C
    const userAData = {
      fullName: 'Alice Walker',
      username: 'alice_story_test',
      email: 'alice_story_test@chatflow.com',
      password: 'Password123!',
      profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    };
    const userBData = {
      fullName: 'Bob Roberts',
      username: 'bob_story_test',
      email: 'bob_story_test@chatflow.com',
      password: 'Password123!',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    };
    const userCData = {
      fullName: 'Charlie Davis',
      username: 'charlie_story_test',
      email: 'charlie_story_test@chatflow.com',
      password: 'Password123!',
      profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    };

    const authA = await registerOrLogin(userAData);
    const authB = await registerOrLogin(userBData);
    const authC = await registerOrLogin(userCData);

    const idA = authA.user._id || authA.user.id;
    const idB = authB.user._id || authB.user.id;
    const idC = authC.user._id || authC.user.id;

    console.log(`User A (Alice): ${idA}`);
    console.log(`User B (Bob): ${idB}`);
    console.log(`User C (Charlie): ${idC}\n`);

    // 2. Ensure A follows B, but A does NOT follow C
    // Check follow status A -> B
    const checkB = await request(`/follow/${idB}/is-following`, {
      headers: { Authorization: `Bearer ${authA.token}` },
    });
    if (!checkB.data.isFollowing) {
      await request(`/follow/${idB}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authA.token}` },
      });
      console.log('User A now follows User B.');
    } else {
      console.log('User A already follows User B.');
    }

    // Check follow status A -> C: ensure unfollowed
    const checkC = await request(`/follow/${idC}/is-following`, {
      headers: { Authorization: `Bearer ${authA.token}` },
    });
    if (checkC.data.isFollowing) {
      await request(`/follow/${idC}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authA.token}` },
      });
      console.log('User A unfollowed User C to establish baseline.');
    } else {
      console.log('User A does NOT follow User C (as expected).');
    }

    // 3. User B creates story
    const storyBRes = await request('/stories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authB.token}` },
      body: JSON.stringify({
        media: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=1200&fit=crop',
        mediaType: 'image',
        text: 'Hello from Bob! Only my followers should see this.',
      }),
    });
    assert(storyBRes.data.success, 'User B created a story successfully');
    const storyBId = storyBRes.data.story._id;

    // 4. User C creates story
    const storyCRes = await request('/stories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authC.token}` },
      body: JSON.stringify({
        media: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=1200&fit=crop',
        mediaType: 'image',
        text: 'Secret story from Charlie - Alice does NOT follow me!',
      }),
    });
    assert(storyCRes.data.success, 'User C created a story successfully');
    const storyCId = storyCRes.data.story._id;

    // 5. TEST: Fetch stories as User A
    // Expected: User A sees self (or Your Story placeholder) and User B. User C MUST NOT APPEAR!
    const storiesResA1 = await request('/stories', {
      headers: { Authorization: `Bearer ${authA.token}` },
    });
    assert(storiesResA1.data.success, 'User A fetched stories feed successfully');

    const groups1 = storiesResA1.data.storyGroups || [];
    const containsB = groups1.some((g) => (g.user._id || g.user.id).toString() === idB.toString());
    const containsC = groups1.some((g) => (g.user._id || g.user.id).toString() === idC.toString());

    assert(containsB, 'User A sees User B in the story feed (since A follows B)');
    assert(!containsC, 'User A DOES NOT see User C in the story feed (since A does NOT follow C)');

    // 6. TEST: User A now follows User C
    console.log('\n--- Step: User A follows User C ---');
    const followCRes = await request(`/follow/${idC}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authA.token}` },
    });
    assert(followCRes.data.success, 'User A followed User C');

    // Fetch stories as User A again
    const storiesResA2 = await request('/stories', {
      headers: { Authorization: `Bearer ${authA.token}` },
    });
    const groups2 = storiesResA2.data.storyGroups || [];
    const containsB_after = groups2.some((g) => (g.user._id || g.user.id).toString() === idB.toString());
    const containsC_after = groups2.some((g) => (g.user._id || g.user.id).toString() === idC.toString());

    assert(containsB_after, 'User A still sees User B');
    assert(containsC_after, 'User A NOW sees User C after following');

    // 7. TEST: User C deletes their story
    console.log('\n--- Step: User C deletes their story ---');
    const deleteCRes = await request(`/stories/${storyCId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authC.token}` },
    });
    assert(deleteCRes.data.success, 'User C deleted story');

    // Fetch stories as User A again
    const storiesResA3 = await request('/stories', {
      headers: { Authorization: `Bearer ${authA.token}` },
    });
    const groups3 = storiesResA3.data.storyGroups || [];
    const containsC_after_delete = groups3.some((g) => (g.user._id || g.user.id).toString() === idC.toString());
    assert(!containsC_after_delete, "User C's story disappeared from User A feed after deletion");

    // 8. TEST: User B deletes their story
    console.log('\n--- Step: User B deletes their story ---');
    const deleteBRes = await request(`/stories/${storyBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authB.token}` },
    });
    assert(deleteBRes.data.success, 'User B deleted story');

    // Fetch stories as User A again
    const storiesResA4 = await request('/stories', {
      headers: { Authorization: `Bearer ${authA.token}` },
    });
    const groups4 = storiesResA4.data.storyGroups || [];
    const containsB_after_delete = groups4.some((g) => (g.user._id || g.user.id).toString() === idB.toString());
    assert(!containsB_after_delete, "User B's story disappeared after deletion");

    // 9. TEST: User A creates their own story
    console.log('\n--- Step: User A creates their own story ---');
    const storyARes = await request('/stories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authA.token}` },
      body: JSON.stringify({
        media: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop',
        mediaType: 'image',
        text: 'My own story by Alice!',
      }),
    });
    assert(storyARes.data.success, 'User A created own story');
    const storyAId = storyARes.data.story._id;

    // Fetch stories as User A
    const storiesResA5 = await request('/stories', {
      headers: { Authorization: `Bearer ${authA.token}` },
    });
    const groups5 = storiesResA5.data.storyGroups || [];
    assert(groups5.length === 1, 'Only User A group is present in the feed');
    assert((groups5[0].user._id || groups5[0].user.id).toString() === idA.toString(), 'User A own story is first in the feed');

    // Cleanup: User A deletes own story
    await request(`/stories/${storyAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authA.token}` },
    });

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed}/${total} assertions passed`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  }
}

runTest();
