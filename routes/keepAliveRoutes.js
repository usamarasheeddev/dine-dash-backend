const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// GET /api/keep-alive
router.get('/', healthController.keepAlive);

module.exports = router;
