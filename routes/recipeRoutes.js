const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), recipeController.getRecipes);
router.get('/:productId', auth(), recipeController.getRecipe);
router.put('/:productId', auth(), recipeController.upsertRecipe);

module.exports = router;
