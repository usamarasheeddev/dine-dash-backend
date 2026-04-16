const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const auth = require('../middleware/authMiddleware');

// Protected routes (Super Admin only)
router.post('/create', auth('superadmin'), companyController.createCompany);
router.get('/all', auth('superadmin'), companyController.getAllCompanies);
router.get('/stats', auth('superadmin'), companyController.getDashboardStats);

// Protected routes (All authenticated users)
router.get('/my-settings', auth(), companyController.getMySettings);
router.put('/my-settings', auth(), companyController.updateMySettings);

// Subscription routes
router.post('/renew', auth(['admin', 'superadmin']), companyController.renewSubscription);

// These must be at the bottom so /:id doesn't match literal paths like /my-settings
router.put('/:id', auth('superadmin'), companyController.updateCompany);

module.exports = router;
