const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCalls,
  initiateCall,
  endCall,
  deleteCall,
} = require('../controllers/callController');

router.use(protect);

router.route('/')
  .get(getCalls)
  .post(initiateCall);

router.route('/:id/end')
  .put(endCall);

router.route('/:id')
  .delete(deleteCall);

module.exports = router;
