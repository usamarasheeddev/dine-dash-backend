const { Order, OrderItem, Product, Customer, InventoryItem, InventoryLedger, Table, Company, sequelize } = require('../models');
const { Op } = require('sequelize');
const { startOfDay, endOfDay } = require('date-fns');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');

// ... (existing code, add at bottom)

// Get Reports Data (Aggregates)
exports.getReport = async (req, res) => {
    try {
        const { startDate, endDate, search, status, orderType } = req.query;
        const companyId = req.user.companyId;

        const company = await Company.findByPk(companyId);
        const tz = company?.timezone || 'UTC';

        const start = fromZonedTime(startOfDay(toZonedTime(new Date(startDate), tz)), tz);
        const end = fromZonedTime(endOfDay(toZonedTime(new Date(endDate), tz)), tz);

        const dateFilter = {
            companyId,
            createdAt: {
                [Op.between]: [start, end]
            }
        };

        // Add additional filters
        if (status) dateFilter.status = status;
        if (orderType) dateFilter.orderType = orderType;

        const include = [
            {
                association: 'items',
                include: ['product']
            },
            {
                model: Customer,
                as: 'customer'
            }
        ];

        // Search logic
        if (search) {
            dateFilter[Op.or] = [
                { id: { [Op.like]: `%${search}%` } },
                { '$customer.name$': { [Op.like]: `%${search}%` } }
            ];
        }

        // 1. Fetch relevant orders
        const orders = await Order.findAll({
            where: dateFilter,
            include
        });

        // Compute base aggregations (similar to frontend `Reports.tsx`)
        const completedOrders = orders.filter(o => o.status === 'completed');
        const filtered = orders; // All orders in range

        const totalRevenue = completedOrders.reduce((s, o) => s + parseFloat(o.finalTotal || o.total || 0), 0);
        const totalTax = completedOrders.reduce((s, o) => s + parseFloat(o.tax || 0), 0);
        const totalDiscount = completedOrders.reduce((s, o) => s + parseFloat(o.discount || 0), 0);
        const avgOrderValue = completedOrders.length ? totalRevenue / completedOrders.length : 0;

        // 2. Product Stats
        const productMap = {};
        completedOrders.forEach(o => {
            o.items.forEach(i => {
                const name = i.product ? i.product.name : 'Unknown Product';
                if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0, variations: {}, addons: {} };
                productMap[name].qty += parseFloat(i.quantity);
                productMap[name].revenue += parseFloat(i.total);

                // Aggregate variations
                if (i.variations && Array.isArray(i.variations)) {
                    i.variations.forEach(v => {
                        const vName = v.name || v.label;
                        if (!productMap[name].variations[vName]) productMap[name].variations[vName] = { name: vName, qty: 0 };
                        productMap[name].variations[vName].qty += parseFloat(i.quantity);
                    });
                }

                // Aggregate addons
                if (i.addons && Array.isArray(i.addons)) {
                    i.addons.forEach(a => {
                        const aName = a.name || a.label;
                        if (!productMap[name].addons[aName]) productMap[name].addons[aName] = { name: aName, qty: 0 };
                        productMap[name].addons[aName].qty += parseFloat(i.quantity);
                    });
                }
            });
        });

        const productStats = Object.values(productMap).map(p => ({
            ...p,
            variations: Object.values(p.variations),
            addons: Object.values(p.addons)
        })).sort((a, b) => b.revenue - a.revenue);

        // 3. Category (OrderType) Stats
        const categoryMap = {};
        completedOrders.forEach(o => {
            const type = o.orderType || 'unknown';
            if (!categoryMap[type]) categoryMap[type] = { name: type, orders: 0, revenue: 0 };
            categoryMap[type].orders++;
            categoryMap[type].revenue += parseFloat(o.finalTotal || o.total || 0);
        });
        const categoryStats = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);

        // 4. Customer Stats
        const customerMap = {};
        completedOrders.forEach(o => {
            const name = o.customer ? o.customer.name : "Walk-in";
            if (!customerMap[name]) customerMap[name] = { name, orders: 0, spent: 0 };
            customerMap[name].orders++;
            customerMap[name].spent += parseFloat(o.finalTotal || o.total || 0);
        });
        const customerStats = Object.values(customerMap).sort((a, b) => b.spent - a.spent);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 5. Ledger entries (credit orders)
        const allLedgerEntries = filtered
            .filter(o => o.paymentMethod === 'credit' || o.payment === 'credit')
            .map(o => ({
                id: o.id,
                customer: o.customer ? o.customer.name : "Walk-in",
                amount: parseFloat(o.finalTotal || o.total || 0),
                date: o.createdAt,
                status: o.status,
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalCredit = allLedgerEntries.reduce((s, e) => s + e.amount, 0);

        // Slice lists for pagination
        const paginatedOrders = filtered.slice(skip, skip + limit);
        const paginatedLedger = allLedgerEntries.slice(skip, skip + limit);

        res.json({
            summary: {
                totalRevenue,
                totalOrders: filtered.length,
                completedOrders: completedOrders.length,
                avgOrderValue,
                totalTax,
                totalDiscount
            },
            orders: paginatedOrders,
            productStats: productStats, // Usually smaller list, but could be sliced if needed
            categoryStats,
            customerStats,
            ledger: {
                entries: paginatedLedger,
                totalCredit,
                totalCount: allLedgerEntries.length
            },
            pagination: {
                totalCount: filtered.length,
                totalPages: Math.ceil(filtered.length / limit),
                currentPage: page,
                limit
            }
        });

    } catch (error) {
        console.error("Reports API Error:", error);
        res.status(500).json({ message: 'Server error retrieving reports' });
    }
};
// Get all orders (paginated)
exports.getOrders = async (req, res) => {
    try {
        const { search, status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const where = { companyId: req.user.companyId };
        if (status) where.status = status;

        const include = [
            {
                association: 'items',
                include: ['product']
            },
            'customer', 'waiter', 'table', 'branch'
        ];

        if (search) {
            where[Op.or] = [
                { id: { [Op.like]: `%${search}%` } },
                { '$customer.name$': { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows: orders } = await Order.findAndCountAll({
            where,
            include,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            orders,
            totalCount: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
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
                    total: item.total,
                    variations: item.variations,
                    addons: item.addons
                }, { transaction });

                // Update product stock (legacy basic tracking)
                const product = await Product.findByPk(item.productId, { transaction });
                if (product) {
                    product.stock_quantity -= item.quantity;
                    await product.save({ transaction });

                    // Auto-deduct inventory: look up InventoryItem linked to this Product
                    const invItem = await InventoryItem.findOne({
                        where: { productId: product.id, companyId: req.user.companyId },
                        transaction
                    });
                    if (invItem) {
                        const deductAmount = item.quantity;
                        const previousStock = parseFloat(invItem.quantity || 0);
                        const newStock = previousStock - deductAmount;

                        invItem.quantity = newStock;
                        await invItem.save({ transaction });

                        await InventoryLedger.create({
                            inventoryItemId: invItem.id,
                            companyId: req.user.companyId,
                            userId: req.user.id,
                            type: 'deduction',
                            quantityChange: -deductAmount,
                            previousStock,
                            newStock,
                            note: `Auto-deducted for POS Order (Product: ${product.name})`
                        }, { transaction });
                    }
                }
            }
        }

        // Update customer balance if it's a credit order or if payment is partial?
        // For now, assuming standard logic. If there's a customerId, maybe update their balance?
        // Leaving that for Ledger/Voucher logic or explicit "On Account" payment method.

        // Update Table status to occupied if dine-in
        if (orderType === 'dine-in' && tableId) {
            await Table.update(
                { status: 'occupied' },
                { where: { id: tableId, companyId: req.user.companyId }, transaction }
            );
        }

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

        if ((status === 'completed' || status === 'cancelled') && order.tableId) {
            await Table.update(
                { status: 'available' },
                { where: { id: order.tableId, companyId: req.user.companyId } }
            );
        }

        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Process Payment / Complete Order
exports.payOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, discount, finalTotal, status } = req.body;
        const order = await Order.findOne({ where: { id, companyId: req.user.companyId } });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.paymentMethod = paymentMethod;
        if (discount !== undefined) order.discount = discount;
        if (finalTotal !== undefined) order.finalTotal = finalTotal;
        order.status = status || 'completed'; // usually paid means completed or preparing
        await order.save();

        if ((order.status === 'completed' || order.status === 'cancelled') && order.tableId) {
            await Table.update(
                { status: 'available' },
                { where: { id: order.tableId, companyId: req.user.companyId } }
            );
        }

        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
