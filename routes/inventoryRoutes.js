const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');

// Categories CRUD
router.get('/categories', auth(), inventoryController.getCategories);
router.post('/categories', auth(), inventoryController.addCategory);
router.put('/categories/:id', auth(), inventoryController.updateCategory);
router.delete('/categories/:id', auth(), inventoryController.deleteCategory);

// Items CRUD
router.get('/', auth(), inventoryController.getItems);
router.post('/', auth(), inventoryController.addItem);
router.put('/:id', auth(), inventoryController.updateItem);
router.delete('/:id', auth(), inventoryController.deleteItem);

// Ledger operations
router.post('/:id/movement', auth(), inventoryController.addStockMovement);
router.get('/:id/ledger', auth(), inventoryController.getInventoryLedger);

module.exports = router;
