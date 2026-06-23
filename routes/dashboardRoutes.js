const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');

router.use(auth());
router.get('/stats', dashboardController.getDashboardStats);
router.get('/finance', dashboardController.getFinanceSummary);

module.exports = router;
