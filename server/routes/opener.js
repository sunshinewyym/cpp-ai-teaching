const express = require('express');
const router = express.Router();
const { handleOpener } = require('../controllers/openerController');

router.post('/', handleOpener);

module.exports = router;
