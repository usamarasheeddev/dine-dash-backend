const express = require('express');
const router = express.Router();
const serviceRequestController = require('../controllers/serviceRequestController');
const auth = require('../middleware/authMiddleware');

// Public route to submit request
router.post('/submit', serviceRequestController.submitRequest);

// Protected routes (Super Admin only)
router.get('/', auth('superadmin'), serviceRequestController.getAllRequests);
router.put('/:id/status', auth('superadmin'), serviceRequestController.updateRequestStatus);

module.exports = router;
