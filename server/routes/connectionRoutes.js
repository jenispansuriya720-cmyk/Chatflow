const express = require('express');
const router = express.Router();
const {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  removeConnection,
  getConnectionStatus,
  getPendingRequests,
  getConnections,
} = require('../controllers/connectionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getConnections);
router.get('/requests', getPendingRequests);
router.get('/pending', getPendingRequests);

router.get('/status/:id', getConnectionStatus);
router.get('/:id/status', getConnectionStatus);

router.post('/request/:id', sendConnectionRequest);
router.post('/accept/:id', acceptConnectionRequest);
router.post('/reject/:id', rejectConnectionRequest);
router.delete('/cancel/:id', cancelConnectionRequest);

router.post('/:id/accept', acceptConnectionRequest);
router.post('/:id/reject', rejectConnectionRequest);
router.delete('/:id/cancel', cancelConnectionRequest);
router.delete('/:id', removeConnection);
router.post('/:id', sendConnectionRequest);

module.exports = router;
