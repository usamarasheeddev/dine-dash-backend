const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/authMiddleware');

// Categories
router.get('/categories', auth(), productController.getCategories);
router.post('/categories', auth(), productController.addCategory);
router.put('/categories/:id', auth(), productController.updateCategory);

// Products
router.get('/', auth(), productController.getProducts);
router.post('/', auth(), productController.addProduct);
router.put('/:id', auth(), productController.updateProduct);
router.delete('/:id', auth(), productController.deleteProduct);

module.exports = router;
