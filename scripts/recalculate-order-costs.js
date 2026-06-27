const { OrderItem, Order, RecipeItem, InventoryItem } = require('../models');

async function recalculate() {
    console.log("Starting order item cost price recalculation...");
    let checkedCount = 0;
    let updatedCount = 0;
    let totalCostReduction = 0;

    const items = await OrderItem.findAll({
        include: [{ model: Order, as: 'order' }]
    });

    for (const item of items) {
        checkedCount++;
        const order = item.order;
        if (!order) {
            console.log(`Skipping OrderItem #${item.id} - No associated Order found`);
            continue;
        }

        const productId = item.productId;
        const companyId = order.companyId;

        // Recalculate cost price using same variation/addon-specific logic
        const recipeItemsForCost = await RecipeItem.findAll({
            where: { productId, companyId }
        });

        if (recipeItemsForCost.length === 0) {
            // No recipe linked to this product
            continue;
        }

        const orderedVariations = [];
        if (item.variations) {
            if (typeof item.variations === 'object' && !Array.isArray(item.variations)) {
                Object.entries(item.variations).forEach(([vName, optLabel]) => {
                    if (optLabel) {
                        orderedVariations.push(optLabel.toString().toLowerCase());
                        orderedVariations.push(`${vName}: ${optLabel}`.toString().toLowerCase());
                    }
                });
            } else if (Array.isArray(item.variations)) {
                item.variations.forEach(v => {
                    if (v.value) {
                        orderedVariations.push(v.value.toString().toLowerCase());
                        if (v.name) orderedVariations.push(`${v.name}: ${v.value}`.toString().toLowerCase());
                    } else if (typeof v === 'string') {
                        orderedVariations.push(v.toLowerCase());
                    }
                });
            }
        }

        const orderedAddons = [];
        if (item.addons) {
            if (Array.isArray(item.addons)) {
                item.addons.forEach(a => {
                    if (a.name) orderedAddons.push(a.name.toString().toLowerCase());
                    else if (typeof a === 'string') orderedAddons.push(a.toLowerCase());
                });
            } else if (typeof item.addons === 'object') {
                Object.keys(item.addons).forEach(k => orderedAddons.push(k.toLowerCase()));
            }
        }

        let baseCost = 0;
        let activeVariationCost = 0;
        let itemCostPrice = 0;
        const hasVarRecipeItems = recipeItemsForCost.some(ri => 
            ri.variationName && 
            orderedVariations.includes(ri.variationName.trim().toLowerCase()) && 
            !ri.addonName
        );

        for (const ri of recipeItemsForCost) {
            const invItem = await InventoryItem.findByPk(ri.inventoryItemId);
            if (invItem) {
                const cost = parseFloat(invItem.costPerUnit || 0) * parseFloat(ri.quantity || 0);
                if (!ri.variationName && !ri.addonName) {
                    baseCost += cost;
                } else if (ri.variationName && !ri.addonName) {
                    if (orderedVariations.includes(ri.variationName.trim().toLowerCase())) {
                        activeVariationCost += cost;
                    }
                } else if (ri.addonName) {
                    if (orderedAddons.includes(ri.addonName.trim().toLowerCase())) {
                        itemCostPrice += cost;
                    }
                }
            }
        }

        if (hasVarRecipeItems) {
            itemCostPrice += activeVariationCost;
        } else {
            itemCostPrice += baseCost;
        }

        const oldCostPrice = parseFloat(item.costPrice || 0);
        const diff = oldCostPrice - itemCostPrice;

        if (Math.abs(diff) > 0.01) {
            totalCostReduction += (diff * parseFloat(item.quantity || 0));
            item.costPrice = itemCostPrice;
            await item.save();
            updatedCount++;
            console.log(`Updated OrderItem #${item.id} (Product: ${productId}) in Order #${order.id}: costPrice changed from ${oldCostPrice.toFixed(2)} to ${itemCostPrice.toFixed(2)}`);
        }
    }

    console.log(`Reconciliation Complete!`);
    console.log(`Checked: ${checkedCount} items`);
    console.log(`Updated: ${updatedCount} items`);
    console.log(`Total COGS/Cost Reduction: ${totalCostReduction.toFixed(2)}`);
    process.exit(0);
}

recalculate().catch(err => {
    console.error("Recalculation error:", err);
    process.exit(1);
});
