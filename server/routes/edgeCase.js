const express = require('express');
const router = express.Router();
const { handleEdgeCase } = require('../controllers/edgeCaseController');

router.post('/', handleEdgeCase);

module.exports = router;
