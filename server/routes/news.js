const express = require('express');
const router = express.Router();
const { handleNews } = require('../controllers/newsController');

router.get('/', handleNews);

module.exports = router;
