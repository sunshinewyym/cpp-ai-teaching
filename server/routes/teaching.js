const express = require('express');
const { createRateLimit } = require('../middleware/rateLimit');
const router = express.Router();
const {
  handleGenerateExample,
  handleGenerateExercise,
  handleGenerateScript,
  handleGenerateHint,
  handleDebugVerify,
  handleDebugAnalyze,
  handleDebugExplain,
  handleDebugCode,
  handleDebugHint,
} = require('../controllers/teachingController');

const debugRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.DEBUG_REQUESTS_PER_MINUTE || 30),
  message: '调试请求过于频繁，请稍后再试。',
});

router.post('/generate-example', handleGenerateExample);
router.post('/generate-exercise', handleGenerateExercise);
router.post('/generate-script', handleGenerateScript);
router.post('/generate-hint', handleGenerateHint);
router.post('/debug-code', debugRateLimit, handleDebugCode);
router.post('/debug-code/verify', debugRateLimit, handleDebugVerify);
router.post('/debug-code/analyze', debugRateLimit, handleDebugAnalyze);
router.post('/debug-code/explain', debugRateLimit, handleDebugExplain);
router.post('/debug-code/hint', debugRateLimit, handleDebugHint);

module.exports = router;
