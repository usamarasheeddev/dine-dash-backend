const { Product, ProductCategory } = require('../models');

// --- Categories ---
exports.getCategories = async (req, res) => {
    try {
        const categories = await ProductCategory.findAll({ where: { companyId: req.user.companyId } });
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const { name, image } = req.body;
        const newCategory = await ProductCategory.create({
            name,
            image,
            companyId: req.user.companyId
        });
        res.status(201).json(newCategory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image } = req.body;
        const category = await ProductCategory.findOne({ where: { id, companyId: req.user.companyId } });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        category.name = name || category.name;
        category.image = image || category.image;
        await category.save();
        res.json(category);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await ProductCategory.findOne({ where: { id, companyId: req.user.companyId } });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await category.destroy();
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting category' });
    }
};

// --- Products ---
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { companyId: req.user.companyId },
            include: [
                { model: ProductCategory, as: 'category' },
                { model: require('../models').InventoryItem, as: 'linkedInventory', attributes: ['id', 'name', 'unit', 'quantity'] }
            ]
        });
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addProduct = async (req, res) => {
    try {
        const { name, price, cost, stock_quantity, categoryId, image, isFavourite, variations, addons, active } = req.body;
        const newProduct = await Product.create({
            name,
            price,
            cost,
            stock_quantity: stock_quantity || 0,
            categoryId,
            inventoryItemId: req.body.inventoryItemId || null,
            image,
            isFavourite: isFavourite || false,
            variations: variations || [],
            addons: addons || [],
            active: active !== undefined ? active : true,
            companyId: req.user.companyId
        });
        res.status(201).json(newProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ where: { id, companyId: req.user.companyId } });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.update({
            ...req.body,
            inventoryItemId: req.body.inventoryItemId !== undefined ? req.body.inventoryItemId : product.inventoryItemId
        });
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ where: { id, companyId: req.user.companyId } });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.destroy();
        res.json({ message: 'Product deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
