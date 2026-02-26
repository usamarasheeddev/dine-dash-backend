const { InventoryItem, InventoryLedger, User } = require('../models');

// Get all inventory items
exports.getItems = async (req, res) => {
    try {
        const items = await InventoryItem.findAll({
            where: { companyId: req.user.companyId },
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
        const { name, category, unit, quantity, minStock, costPerUnit, supplier } = req.body;

        const item = await InventoryItem.create({
            companyId: req.user.companyId,
            name,
            category: category || '',
            unit: unit || 'piece',
            quantity: quantity || 0,
            minStock: minStock || 0,
            costPerUnit: costPerUnit || 0,
            supplier: supplier || ''
        });

        res.status(201).json(item);
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ message: 'Server error adding inventory item' });
    }
};

// Update an inventory item
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, unit, quantity, minStock, costPerUnit, supplier } = req.body;

        const item = await InventoryItem.findOne({ where: { id, companyId: req.user.companyId } });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        item.name = name;
        item.category = category || '';
        item.unit = unit || 'piece';
        item.quantity = quantity !== undefined ? quantity : item.quantity;
        item.minStock = minStock !== undefined ? minStock : item.minStock;
        item.costPerUnit = costPerUnit !== undefined ? costPerUnit : item.costPerUnit;
        item.supplier = supplier || '';

        await item.save();
        res.json(item);
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

// Add a stock movement (addition/deduction)
exports.addStockMovement = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, note } = req.body; // type: 'addition', 'deduction', 'adjustment'

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

        if (type === 'addition') {
            quantityChange = parsedQuantity;
            newStock = previousStock + parsedQuantity;
        } else if (type === 'deduction') {
            quantityChange = -parsedQuantity;
            newStock = previousStock - parsedQuantity;
            if (newStock < 0) newStock = 0; // Prevent negative stock mathematically if desired
        } else if (type === 'adjustment') {
            // For strict set adjustments, the 'quantity' might be the exact new value
            // If so, the change is newStock - previousStock.
            // Here we assume quantity is the exact new stock level they want to 'adjust' to.
            newStock = parsedQuantity;
            quantityChange = newStock - previousStock;
        } else {
            return res.status(400).json({ message: 'Invalid movement type' });
        }

        // Update item total
        item.quantity = newStock;
        await item.save();

        // Log the ledger
        const ledger = await InventoryLedger.create({
            inventoryItemId: item.id,
            companyId: req.user.companyId,
            userId: req.user.id,
            type,
            quantityChange,
            previousStock,
            newStock,
            note: note || ''
        });

        res.status(201).json({ item, ledger });
    } catch (error) {
        console.error('Error adding stock movement:', error);
        res.status(500).json({ message: 'Server error adding stock movement' });
    }
};

// Get the ledger history for a specific item
exports.getInventoryLedger = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify item belongs to company first
        const item = await InventoryItem.findOne({ where: { id, companyId: req.user.companyId } });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        const ledger = await InventoryLedger.findAll({
            where: { inventoryItemId: id, companyId: req.user.companyId },
            include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json(ledger);
    } catch (error) {
        console.error('Error fetching inventory ledger:', error);
        res.status(500).json({ message: 'Server error fetching inventory ledger' });
    }
};
