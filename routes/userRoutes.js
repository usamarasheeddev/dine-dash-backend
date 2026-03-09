const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), userController.getStaff);
router.post('/', auth(), userController.createStaff);
router.put('/:id', auth(), userController.updateStaff);
router.delete('/:id', auth(), userController.deleteStaff);

module.exports = router;
