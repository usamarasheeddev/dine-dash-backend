const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), orderController.getOrders);
router.get('/report', auth(), orderController.getReport);
router.post('/', auth(), orderController.createOrder);
router.put('/:id/status', auth(), orderController.updateOrderStatus);
router.put('/:id/pay', auth(), orderController.payOrder);

module.exports = router;
