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
            let baseCost = 0;
            const variationCosts = {}; // variationName -> cost sum
            const optionLabels = [];

            if (product.variations && Array.isArray(product.variations)) {
                product.variations.forEach(v => {
                    if (v.options && Array.isArray(v.options)) {
                        v.options.forEach(opt => {
                            if (opt.label) optionLabels.push(opt.label);
                        });
                    }
                });
            }
            const uniqueVariationNames = new Set(optionLabels);

            const items = (product.recipeItems || []).map(item => {
                const purchasePrice = item.inventoryItem ? parseFloat(item.inventoryItem.costPerUnit || 0) : 0;
                const qty = parseFloat(item.quantity || 0);
                const cost = purchasePrice * qty;

                if (item.variationName) {
                    uniqueVariationNames.add(item.variationName);
                }

                return {
                    id: item.id,
                    inventoryItemId: item.inventoryItemId,
                    ingredientId: item.inventoryItemId, // compatibility alias
                    name: item.inventoryItem ? item.inventoryItem.name : 'Unknown Ingredient',
                    quantity: qty,
                    unit: item.inventoryItem ? item.inventoryItem.unit : '',
                    purchasePrice,
                    cost,
                    variationName: item.variationName || null,
                    addonName: item.addonName || null
                };
            });

            // Group costs
            items.forEach(item => {
                if (!item.variationName && !item.addonName) {
                    baseCost += item.cost;
                } else if (item.variationName && !item.addonName) {
                    variationCosts[item.variationName] = (variationCosts[item.variationName] || 0) + item.cost;
                }
            });

            let costPrice = 0;
            if (uniqueVariationNames.size > 0) {
                let totalVariationsCost = 0;
                uniqueVariationNames.forEach(vName => {
                    const hasVarItems = items.some(item => item.variationName && item.variationName.trim().toLowerCase() === vName.trim().toLowerCase() && !item.addonName);
                    if (hasVarItems) {
                        totalVariationsCost += (variationCosts[vName] || 0);
                    } else {
                        totalVariationsCost += baseCost;
                    }
                });
                costPrice = totalVariationsCost / uniqueVariationNames.size;
            } else {
                costPrice = baseCost;
            }

            let sellingPrice = parseFloat(product.price || 0);
            let totalSellingPrice = 0;
            let variationsCount = 0;
            if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
                product.variations.forEach(v => {
                    if (v.options && Array.isArray(v.options)) {
                        v.options.forEach(opt => {
                            if (opt.label) {
                                totalSellingPrice += parseFloat(opt.priceAdjustment || 0);
                                variationsCount++;
                            }
                        });
                    }
                });
            }
            if (variationsCount > 0) {
                sellingPrice = totalSellingPrice / variationsCount;
            }

            const profit = sellingPrice - costPrice;
            const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

            return {
                productId: product.id,
                productName: product.name,
                variations: product.variations || [],
                addons: product.addons || [],
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
        const { items } = req.body; // Array of { inventoryItemId, quantity, variationName, addonName }

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
                        quantity: parseFloat(item.quantity),
                        variationName: item.variationName || null,
                        addonName: item.addonName || null
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
