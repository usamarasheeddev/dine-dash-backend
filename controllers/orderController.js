const { Order, OrderItem, Product, Customer, sequelize } = require('../models');

// Get all orders
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { companyId: req.user.companyId },
            include: ['items', 'customer', 'waiter', 'table', 'branch']
        });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new order
exports.createOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            orderType, subTotal, discount, tax, finalTotal, status,
            paymentMethod, waiterId, tableId, customerId, branchId, items
        } = req.body;

        const newOrder = await Order.create({
            orderType,
            subTotal,
            discount,
            tax,
            finalTotal,
            status: status || 'pending',
            paymentMethod,
            waiterId,
            tableId,
            customerId,
            branchId,
            companyId: req.user.companyId,
            isUploaded: true
        }, { transaction });

        if (items && items.length > 0) {
            for (const item of items) {
                await OrderItem.create({
                    orderId: newOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total
                }, { transaction });

                // Update product stock
                const product = await Product.findByPk(item.productId, { transaction });
                if (product) {
                    product.stock_quantity -= item.quantity;
                    await product.save({ transaction });
                }
            }
        }

        // Update customer balance if it's a credit order or if payment is partial?
        // For now, assuming standard logic. If there's a customerId, maybe update their balance?
        // Leaving that for Ledger/Voucher logic or explicit "On Account" payment method.

        await transaction.commit();

        // Fetch the created order with items
        const createdOrder = await Order.findByPk(newOrder.id, {
            include: ['items'],
        });

        res.status(201).json(createdOrder);
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const order = await Order.findOne({ where: { id, companyId: req.user.companyId } });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = status;
        await order.save();
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
