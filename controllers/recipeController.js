const { Product, RecipeItem, InventoryItem, sequelize } = require('../models');

exports.getRecipes = async (req, res) => {
    try {
        // Find all products and their linked recipe items with ingredients
        const products = await Product.findAll({
            where: { companyId: req.user.companyId, active: true },
            include: [{
                model: RecipeItem,
                as: 'recipeItems',
                include: [{ model: InventoryItem, as: 'inventoryItem' }]
            }],
            order: [['name', 'ASC']]
        });

        // Compute pricing & margin for each product recipe
        const recipes = products.map(product => {
            let costPrice = 0;
            const items = (product.recipeItems || []).map(item => {
                const purchasePrice = item.inventoryItem ? parseFloat(item.inventoryItem.costPerUnit || 0) : 0;
                const qty = parseFloat(item.quantity || 0);
                const cost = purchasePrice * qty;
                costPrice += cost;

                return {
                    id: item.id,
                    inventoryItemId: item.inventoryItemId,
                    ingredientId: item.inventoryItemId, // compatibility alias
                    name: item.inventoryItem ? item.inventoryItem.name : 'Unknown Ingredient',
                    quantity: qty,
                    unit: item.inventoryItem ? item.inventoryItem.unit : '',
                    purchasePrice,
                    cost
                };
            });

            const sellingPrice = parseFloat(product.price || 0);
            const profit = sellingPrice - costPrice;
            const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

            return {
                productId: product.id,
                productName: product.name,
                sellingPrice,
                costPrice,
                theoreticalProfit: profit,
                theoreticalMargin: margin,
                items
            };
        });

        res.json(recipes);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ message: 'Server error fetching recipes' });
    }
};

exports.getRecipe = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findOne({
            where: { id: productId, companyId: req.user.companyId }
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const items = await RecipeItem.findAll({
            where: { productId, companyId: req.user.companyId },
            include: [{ model: InventoryItem, as: 'inventoryItem' }],
            order: [['createdAt', 'ASC']]
        });

        res.json(items);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ message: 'Server error fetching recipe' });
    }
};

exports.upsertRecipe = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { productId } = req.params;
        const { items } = req.body; // Array of { inventoryItemId, quantity }

        const product = await Product.findOne({
            where: { id: productId, companyId: req.user.companyId },
            transaction
        });

        if (!product) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Product not found' });
        }

        // Delete existing recipe items
        await RecipeItem.destroy({
            where: { productId, companyId: req.user.companyId },
            transaction
        });

        // Insert new ones
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const itemId = item.inventoryItemId || item.ingredientId;
                if (itemId && parseFloat(item.quantity) > 0) {
                    await RecipeItem.create({
                        companyId: req.user.companyId,
                        productId,
                        inventoryItemId: itemId,
                        quantity: parseFloat(item.quantity)
                    }, { transaction });
                }
            }
        }

        await transaction.commit();

        // Get the updated recipe
        const updatedItems = await RecipeItem.findAll({
            where: { productId, companyId: req.user.companyId },
            include: [{ model: InventoryItem, as: 'inventoryItem' }]
        });

        res.json({ message: 'Recipe updated successfully', items: updatedItems });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating recipe:', error);
        res.status(500).json({ message: 'Server error updating recipe' });
    }
};
