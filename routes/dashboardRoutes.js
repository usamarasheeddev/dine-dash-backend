const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');

router.use(auth());
router.get('/stats',           dashboardController.getDashboardStats);
router.get('/finance',         dashboardController.getFinanceSummary);

// ── Chunk endpoints ─────────────────────────────
router.get('/stats/summary',       dashboardController.getDashboardSummary);
router.get('/stats/orders-status', dashboardController.getDashboardOrdersStatus);
router.get('/stats/inventory',     dashboardController.getDashboardInventory);
router.get('/stats/top-products',  dashboardController.getDashboardTopProducts);
router.get('/stats/graph',         dashboardController.getDashboardGraph);
router.get('/stats/recent-orders', dashboardController.getDashboardRecentOrders);

module.exports = router;
