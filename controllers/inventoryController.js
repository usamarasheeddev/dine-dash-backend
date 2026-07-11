const { InventoryItem, InventoryLedger, InventoryCategory, User, Product, sequelize } = require('../models');

// Categories Controllers
exports.getCategories = async (req, res) => {
    try {
        const categories = await InventoryCategory.findAll({
            where: { companyId: req.user.companyId },
            order: [['name', 'ASC']]
        });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching inventory categories:', error);
        res.status(500).json({ message: 'Server error fetching inventory categories' });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }
        const category = await InventoryCategory.create({
            companyId: req.user.companyId,
            name
        });
        res.status(201).json(category);
    } catch (error) {
        console.error('Error adding inventory category:', error);
        res.status(500).json({ message: 'Server error adding inventory category' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const category = await InventoryCategory.findOne({ where: { id, companyId: req.user.companyId } });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        category.name = name;
        await category.save();
        res.json(category);
    } catch (error) {
        console.error('Error updating inventory category:', error);
        res.status(500).json({ message: 'Server error updating inventory category' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await InventoryCategory.findOne({ where: { id, companyId: req.user.companyId } });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        // Unlink or nullify items referencing this category
        await InventoryItem.update({ categoryId: null }, { where: { categoryId: id } });
        await category.destroy();
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting inventory category:', error);
        res.status(500).json({ message: 'Server error deleting inventory category' });
    }
};

// Get all inventory items (optional filter by type)
exports.getItems = async (req, res) => {
    try {
        const { type } = req.query; // 'simple' | 'ingredient'
        const whereClause = { companyId: req.user.companyId };
        if (type) {
            whereClause.type = type;
        }

        const items = await InventoryItem.findAll({
            where: whereClause,
            include: [
                { model: Product, as: 'linkedProduct', attributes: ['id', 'name', 'price'] },
                { model: InventoryCategory, as: 'category', attributes: ['id', 'name'] }
            ],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COALESCE(SUM(ABS("quantityChange")), 0)
                            FROM "InventoryLedgers" AS ledger
                            WHERE ledger."inventoryItemId" = "InventoryItem".id
                            AND ledger.type = 'waste'
                        )`),
                        'totalWaste'
                    ]
                ]
            },
            order: [['createdAt', 'DESC']]
        });
        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Server error fetching inventory items' });
    }
};

// Add a new inventory item
exports.addItem = async (req, res) => {
    try {
        const { name, categoryId, type, unit, quantity, minStock, costPerUnit, supplier, productId } = req.body;

        const item = await InventoryItem.create({
            companyId: req.user.companyId,
            name,
            categoryId: categoryId || null,
            type: type || 'simple',
            unit: unit || 'piece',
            quantity: quantity || 0,
            minStock: minStock || 0,
            costPerUnit: costPerUnit || 0,
            supplier: supplier || '',
            productId: productId || null
        });

        // If initial quantity is greater than 0, create a ledger addition to track the purchase expense
        if (item.quantity > 0) {
            await InventoryLedger.create({
                inventoryItemId: item.id,
                companyId: req.user.companyId,
                userId: req.user.id,
                type: 'addition',
                quantityChange: item.quantity,
                previousStock: 0,
                newStock: item.quantity,
                purchaseCost: item.quantity * item.costPerUnit,
                note: 'Initial stock purchase'
            });
        }

        // Load category and linkedProduct associations to match getItems output
        const responseItem = await InventoryItem.findOne({
            where: { id: item.id },
            include: [
                { model: Product, as: 'linkedProduct', attributes: ['id', 'name', 'price'] },
                { model: InventoryCategory, as: 'category', attributes: ['id', 'name'] }
            ]
        });

        res.status(201).json(responseItem);
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ message: 'Server error adding inventory item' });
    }
};

// Update an inventory item
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, categoryId, type, unit, quantity, minStock, costPerUnit, supplier, productId } = req.body;

        const item = await InventoryItem.findOne({ where: { id, companyId: req.user.companyId } });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        item.name = name;
        item.categoryId = categoryId !== undefined ? (categoryId || null) : item.categoryId;
        item.type = type || item.type;
        item.unit = unit || 'piece';
        item.quantity = quantity !== undefined ? quantity : item.quantity;
        item.minStock = minStock !== undefined ? minStock : item.minStock;
        item.costPerUnit = costPerUnit !== undefined ? costPerUnit : item.costPerUnit;
        item.supplier = supplier || '';
        item.productId = productId !== undefined ? (productId || null) : item.productId;

        await item.save();

        const responseItem = await InventoryItem.findOne({
            where: { id: item.id },
            include: [
                { model: Product, as: 'linkedProduct', attributes: ['id', 'name', 'price'] },
                { model: InventoryCategory, as: 'category', attributes: ['id', 'name'] }
            ]
        });

        res.json(responseItem);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ message: 'Server error updating inventory item' });
    }
};

// Delete an inventory item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await InventoryItem.findOne({ where: { id, companyId: req.user.companyId } });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        await item.destroy();
        res.json({ message: 'Inventory item deleted' });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ message: 'Server error deleting inventory item' });
    }
};

exports.addStockMovement = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, note, totalCost } = req.body; // type: 'addition', 'deduction', 'adjustment', 'waste'

        const item = await InventoryItem.findOne({ where: { id, companyId: req.user.companyId } });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        const parsedQuantity = Math.abs(parseFloat(quantity || 0));
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }

        const previousStock = parseFloat(item.quantity || 0);
        let newStock = previousStock;
        let quantityChange = 0;
        let purchaseCost = 0;

        if (type === 'addition') {
            quantityChange = parsedQuantity;
            newStock = previousStock + parsedQuantity;
            // If totalCost is provided from UI, use it. Otherwise compute from item's unit cost.
            if (totalCost !== undefined && totalCost !== '') {
                purchaseCost = parseFloat(totalCost);
                item.costPerUnit = purchaseCost / parsedQuantity;
            } else {
                purchaseCost = parsedQuantity * parseFloat(item.costPerUnit || 0);
            }
        } else if (type === 'deduction' || type === 'waste') {
            quantityChange = -parsedQuantity;
            newStock = previousStock - parsedQuantity;
            if (newStock < 0) newStock = 0; // Prevent negative stock mathematically if desired
        } else if (type === 'adjustment') {
            newStock = parsedQuantity;
            quantityChange = newStock - previousStock;
        } else {
            return res.status(400).json({ message: 'Invalid movement type' });
        }

        // Update item total
        item.quantity = newStock;
        await item.save();

        // If the item is linked to a product, update the product's price and cost to match the new unit cost
        if (item.productId && type === 'addition' && purchaseCost > 0) {
            const Product = require('../models').Product;
            const linkedProduct = await Product.findByPk(item.productId);
            if (linkedProduct) {
                linkedProduct.cost = item.costPerUnit;
                // As requested: "on add new price update price of that product"
                linkedProduct.price = item.costPerUnit;
                await linkedProduct.save();
            }
        }

        // Log the ledger
        const ledger = await InventoryLedger.create({
            inventoryItemId: item.id,
            companyId: req.user.companyId,
            userId: req.user.id,
            type,
            quantityChange,
            previousStock,
            newStock,
            purchaseCost,
            note: note || ''
        });

        res.status(201).json({ item, ledger });
    } catch (error) {
        console.error('Error adding stock movement:', error);
        res.status(500).json({ message: 'Server error adding stock movement' });
    }
};

// Get the ledger history for a specific item (paginated)
exports.getInventoryLedger = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Verify item belongs to company first
        const item = await InventoryItem.findOne({ where: { id, companyId: req.user.companyId } });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        const { count, rows: ledger } = await InventoryLedger.findAndCountAll({
            where: { inventoryItemId: id, companyId: req.user.companyId },
            include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            ledger,
            totalCount: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('Error fetching inventory ledger:', error);
        res.status(500).json({ message: 'Server error fetching inventory ledger' });
    }
};
