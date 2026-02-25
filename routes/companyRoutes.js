const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const auth = require('../middleware/authMiddleware');

// Protected routes (Super Admin only)
router.post('/create', auth('superadmin'), companyController.createCompany);
router.get('/all', auth('superadmin'), companyController.getAllCompanies);
router.get('/stats', auth('superadmin'), companyController.getDashboardStats);
router.put('/:id', auth('superadmin'), companyController.updateCompany);

module.exports = router;
