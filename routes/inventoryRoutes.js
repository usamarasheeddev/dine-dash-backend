const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), inventoryController.getItems);
router.post('/', auth(), inventoryController.addItem);
router.put('/:id', auth(), inventoryController.updateItem);
router.delete('/:id', auth(), inventoryController.deleteItem);

// Ledger operations
router.post('/:id/movement', auth(), inventoryController.addStockMovement);
router.get('/:id/ledger', auth(), inventoryController.getInventoryLedger);

module.exports = router;
