const express = require('express');
const router = express.Router();
const {
  handleExecute,
  handleAbort,
  handleActive,
  handleTeachingAgent,
  handleDebugAgent,
} = require('../controllers/agentController');

router.post('/execute', handleExecute);
router.post('/abort', handleAbort);
router.get('/active', handleActive);
router.post('/teaching', handleTeachingAgent);
router.post('/debug', handleDebugAgent);

module.exports = router;
