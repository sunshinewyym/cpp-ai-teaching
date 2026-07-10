const express = require('express');
const router = express.Router();
const { handleEdgeCase, handleFetchProblem } = require('../controllers/edgeCaseController');

router.get('/problem/:id', handleFetchProblem);
router.post('/', handleEdgeCase);

module.exports = router;
