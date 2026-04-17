const express = require('express');
const router = express.Router();
const subscriptionPlanController = require('../controllers/subscriptionPlanController');
const auth = require('../middleware/authMiddleware');

// Public route to get active plans
router.get('/', subscriptionPlanController.getPlans);

// Protected routes (Super Admin only)
router.post('/', auth('superadmin'), subscriptionPlanController.createPlan);
router.put('/:id', auth('superadmin'), subscriptionPlanController.updatePlan);
router.delete('/:id', auth('superadmin'), subscriptionPlanController.deletePlan);

module.exports = router;
