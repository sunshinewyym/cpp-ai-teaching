const express = require('express');
const router = express.Router();
const {
  handleGenerateExample,
  handleGenerateExercise,
  handleGenerateScript,
  handleGenerateHint,
  handleDebugCode,
  handleDebugHint,
} = require('../controllers/teachingController');

router.post('/generate-example', handleGenerateExample);
router.post('/generate-exercise', handleGenerateExercise);
router.post('/generate-script', handleGenerateScript);
router.post('/generate-hint', handleGenerateHint);
router.post('/debug-code', handleDebugCode);
router.post('/debug-code/hint', handleDebugHint);

module.exports = router;
