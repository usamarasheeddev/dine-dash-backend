const express = require('express');
const router = express.Router();
const waiterController = require('../controllers/waiterController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), waiterController.getWaiters);
router.post('/', auth(), waiterController.addWaiter);
router.put('/:id', auth(), waiterController.updateWaiter);
router.delete('/:id', auth(), waiterController.deleteWaiter);

module.exports = router;
