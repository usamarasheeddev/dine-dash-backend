const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const auth = require('../middleware/authMiddleware');

// All routes are protected and require 'admin' or appropriate role
// Adjust roles as needed. For now, assuming any authenticated user of the company can view, but only admins can manage.
// Actually, let's keep it simple: authenticated users can do most things for now, or refine later.

router.get('/', auth(), branchController.getBranches);
router.post('/', auth(['admin', 'superadmin']), branchController.addBranch);
router.put('/:id', auth(['admin', 'superadmin']), branchController.updateBranch);
router.delete('/:id', auth(['admin', 'superadmin']), branchController.deleteBranch);

module.exports = router;
