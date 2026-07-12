const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), orderController.getOrders);
router.get('/report', auth(), orderController.getReport);

// ── Report chunk endpoints ──────────────────────
router.get('/report/orders',     auth(), orderController.getReportOrders);
router.get('/report/products',   auth(), orderController.getReportProducts);
router.get('/report/categories', auth(), orderController.getReportCategories);
router.get('/report/customers',  auth(), orderController.getReportCustomers);
router.get('/report/staff',      auth(), orderController.getReportStaff);
router.get('/report/ledger',     auth(), orderController.getReportLedger);

router.post('/', auth(), orderController.createOrder);
router.put('/:id/status', auth(), orderController.updateOrderStatus);
router.put('/:id/pay', auth(), orderController.payOrder);
router.put('/:id/edit', auth(), orderController.editOrder);

module.exports = router;
