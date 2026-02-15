const { Customer } = require('../models');

// Get all customers
exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll({ where: { companyId: req.user.companyId } });
        res.json(customers);
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
