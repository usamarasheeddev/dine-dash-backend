const { Customer, CustomerLedger, Order } = require('../models');
const cache = require('../utils/cache');

// Get all customers (paginated & searchable)
exports.getCustomers = async (req, res) => {
    try {
        const { search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const cacheKey = `customers:${req.user.companyId}:${search || ''}:${page}:${limit}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const { Op } = require('sequelize');
        const where = { companyId: req.user.companyId };

        if (search) {
            const terms = search.trim().split(/\s+/).filter(Boolean);
            if (terms.length > 0) {
                const isPostgres = Customer.sequelize.options.dialect === 'postgres';
                const likeOp = isPostgres ? Op.iLike : Op.like;

                where[Op.and] = terms.map(term => ({
                    [Op.or]: [
                        { name: { [likeOp]: `%${term}%` } },
                        { phone: { [likeOp]: `%${term}%` } },
                        { address: { [likeOp]: `%${term}%` } }
                    ]
                }));
            }
        }

        const { count, rows: customers } = await Customer.findAndCountAll({
            where,
            attributes: {
                include: [
                    [
                        Customer.sequelize.literal(`(
                            SELECT COALESCE(COUNT(*), 0)
                            FROM "Orders" AS o
                            WHERE o."customerId" = "Customer".id
                        )`),
                        'ordersCount'
                    ],
                    [
                        Customer.sequelize.literal(`(
                            SELECT COALESCE(COUNT(*), 0)
                            FROM "CustomerLedgers" AS cl
                            WHERE cl."customerId" = "Customer".id
                        )`),
                        'ledgerCount'
                    ]
                ]
            },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        // Map to include orders count and balance
        const formatted = customers.map(c => {
            const customerObj = c.toJSON();
            return {
                id: customerObj.id,
                name: customerObj.name,
                phone: customerObj.phone,
                email: customerObj.email || '',
                address: customerObj.address,
                balance: Number(customerObj.current_balance || 0),
                orders: Number(customerObj.ordersCount || 0),
                ledger: customerObj.ledgerCount > 0 ? Array(Number(customerObj.ledgerCount)).fill({}) : [],
                createdAt: customerObj.createdAt
            };
        });

        const totalOutstanding = await Customer.sum('current_balance', { where: { companyId: req.user.companyId } });

        const responseData = {
            customers: formatted,
            totalCount: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalOutstanding: Number(totalOutstanding || 0)
        };

        cache.set(cacheKey, responseData, 60000); // Cache for 1 minute
        res.json(responseData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a new customer
exports.addCustomer = async (req, res) => {
    try {
        const { name, phone, address, initial_balance } = req.body;
        const newCustomer = await Customer.create({
            name,
            phone,
            address,
            initial_balance: initial_balance || 0,
            current_balance: initial_balance || 0,
            companyId: req.user.companyId
        });

        cache.invalidateCustomerCache(req.user.companyId);
        res.status(201).json(newCustomer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update a customer
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address } = req.body;
        const customer = await Customer.findOne({ where: { id, companyId: req.user.companyId } });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        customer.name = name || customer.name;
        customer.phone = phone || customer.phone;
        customer.address = address || customer.address;

        await customer.save();
        cache.invalidateCustomerCache(req.user.companyId);
        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a customer
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findOne({ where: { id, companyId: req.user.companyId } });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Check if customer has outstanding balance
        if (Number(customer.current_balance || 0) > 0) {
            return res.status(400).json({ message: 'Cannot delete a customer with a non-zero outstanding balance.' });
        }

        // Check if customer has active ledger entries
        const ledgerCount = await CustomerLedger.count({ where: { customerId: id, companyId: req.user.companyId } });
        if (ledgerCount > 0) {
            return res.status(400).json({ message: 'Cannot delete a customer with ledger history.' });
        }

        await customer.destroy();
        cache.invalidateCustomerCache(req.user.companyId);
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a ledger entry
exports.addLedgerEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, amount, note } = req.body;

        const customer = await Customer.findOne({ where: { id, companyId: req.user.companyId } });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const parsedAmount = parseFloat(amount || 0);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        // Create the ledger entry
        const entry = await CustomerLedger.create({
            customerId: customer.id,
            companyId: req.user.companyId,
            type,
            amount: parsedAmount,
            note: note || '',
            date: new Date()
        });

        // Balance = amount customer owes the company (debt).
        // Debit  → customer is charged / owes more  → balance increases (+)
        // Credit → credit is given to customer      → balance decreases (-)
        // Payment→ customer pays off debt            → balance decreases (-)
        let balanceChange = 0;
        if (type === 'debit') {
            balanceChange = parsedAmount;   // Customer owes more
        } else {
            balanceChange = -parsedAmount;  // credit or payment reduces what they owe
        }

        customer.current_balance = Number(customer.current_balance || 0) + balanceChange;

        // Prevent negative balances (overpayment clamps to 0)
        if (customer.current_balance < 0) {
            customer.current_balance = 0;
        }
        await customer.save();

        cache.invalidateCustomerCache(req.user.companyId);
        res.status(201).json({ customer, entry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error adding ledger entry' });
    }
};

// Get a single customer by ID (No relationship includes for performance)
exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findOne({
            where: { id, companyId: req.user.companyId }
        });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const customerObj = customer.toJSON();
        res.json({
            id: customerObj.id,
            name: customerObj.name,
            phone: customerObj.phone,
            email: customerObj.email || '',
            address: customerObj.address,
            balance: Number(customerObj.current_balance || 0),
            createdAt: customerObj.createdAt
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all ledger entries for a specific customer
exports.getCustomerLedger = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: ledger } = await CustomerLedger.findAndCountAll({
            where: { customerId: id, companyId: req.user.companyId },
            order: [['date', 'DESC'], ['createdAt', 'DESC']],
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
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all customer ledger entries across the company (with server-side pagination)
exports.getAllLedgerEntries = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { search } = req.query;

        const { Op } = require('sequelize');
        const ledgerWhere = { companyId: req.user.companyId };
        const customerWhere = { companyId: req.user.companyId };

        if (search) {
            const terms = search.trim().split(/\s+/).filter(Boolean);
            if (terms.length > 0) {
                const isPostgres = Customer.sequelize.options.dialect === 'postgres';
                const likeOp = isPostgres ? Op.iLike : Op.like;

                customerWhere[Op.and] = terms.map(term => ({
                    [Op.or]: [
                        { name: { [likeOp]: `%${term}%` } },
                        { phone: { [likeOp]: `%${term}%` } }
                    ]
                }));
            }
        }

        const { count, rows: ledgers } = await CustomerLedger.findAndCountAll({
            where: ledgerWhere,
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    where: customerWhere,
                    attributes: ['id', 'name', 'phone']
                }
            ],
            order: [['date', 'DESC'], ['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            ledgers,
            totalCount: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
