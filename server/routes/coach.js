const express = require('express');
const {
  handleCreateSession,
  handleDeleteSession,
  handleGetSession,
  handleGenerateGuide,
  handleGenerateArticle,
  handlePrefetchNext,
  handleSubmitProblem,
  handleSubmitTurn,
} = require('../controllers/coachController');

const router = express.Router();

router.post('/guide', handleGenerateGuide);
router.post('/article', handleGenerateArticle);
router.post('/sessions', handleCreateSession);
router.post('/sessions/:id/problem', handleSubmitProblem);
router.post('/sessions/:id/turns', handleSubmitTurn);
router.post('/sessions/:id/prefetch', handlePrefetchNext);
router.get('/sessions/:id', handleGetSession);
router.delete('/sessions/:id', handleDeleteSession);

module.exports = router;
