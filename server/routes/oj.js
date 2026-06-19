const express = require('express');
const router = express.Router();
const {
  handleProblems,
  handleGetProblem,
  handleSubmit,
  handleHint,
  handleDebugHint,
  handleSwitch,
} = require('../controllers/ojController');

router.get('/problems', handleProblems);
router.get('/problem/:id', handleGetProblem);
router.post('/submit', handleSubmit);
router.post('/hint', handleHint);
router.post('/debug-hint', handleDebugHint);
router.post('/switch', handleSwitch);

module.exports = router;
