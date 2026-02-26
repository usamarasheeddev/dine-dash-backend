const { Customer, CustomerLedger, Order } = require('../models');

// Get all customers
exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll({
            where: { companyId: req.user.companyId },
            include: [
                { model: CustomerLedger, as: 'ledger' },
                { model: Order, as: 'orders' }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Map to include orders count and balance
        const formatted = customers.map(c => {
            const customerObj = c.toJSON();
            // Balance is current_balance + initial_balance from the model
            return {
                id: customerObj.id,
                name: customerObj.name,
                phone: customerObj.phone,
                email: customerObj.email || '',
                address: customerObj.address,
                balance: Number(customerObj.current_balance || 0),
                orders: customerObj.orders ? customerObj.orders.length : 0,
                ledger: customerObj.ledger || [],
                createdAt: customerObj.createdAt
            };
        });

        res.json(formatted);
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

        await customer.destroy();
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

        // Update customer balance: payment reduces balance, credit/debit increase balance (usually debt is positive)
        let balanceChange = 0;
        if (type === 'payment') {
            balanceChange = -parsedAmount;
        } else {
            // credit/debit adds to customer balance (debt to company)
            balanceChange = parsedAmount;
        }

        customer.current_balance = Number(customer.current_balance || 0) + balanceChange;

        // Prevent negative total balances (optional; depending on biz logic. Usually ok if they overpay)
        if (customer.current_balance < 0) {
            customer.current_balance = 0;
        }
        await customer.save();

        res.status(201).json({ customer, entry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error adding ledger entry' });
    }
};
