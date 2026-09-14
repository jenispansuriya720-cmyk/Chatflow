const express = require('express');
const router = express.Router();
const {
  toggleFollow,
  acceptFollowRequest,
  rejectFollowRequest,
  getPendingFollowRequests,
  getRelationshipState,
  getFollowers,
  getFollowing,
  checkFollowStatus,
} = require('../controllers/followController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/requests', getPendingFollowRequests);
router.post('/:id/accept', acceptFollowRequest);
router.post('/:id/reject', rejectFollowRequest);
router.get('/:id/relationship', getRelationshipState);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
router.get('/:id/is-following', checkFollowStatus);
router.post('/:id/follow', toggleFollow);
router.post('/:id', toggleFollow);

module.exports = router;
