const { Voucher, Customer } = require('../models');

// Get all vouchers (or filter by customer)
exports.getVouchers = async (req, res) => {
    try {
        const whereClause = { companyId: req.user.companyId };
        if (req.query.customerId) {
            whereClause.customerId = req.query.customerId;
        }

        const vouchers = await Voucher.findAll({
            where: whereClause,
            include: [{ model: Customer, as: 'customer' }]
        });
        res.json(vouchers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a new voucher
exports.addVoucher = async (req, res) => {
    try {
        const { customerId, amount, type, description, date } = req.body;

        const newVoucher = await Voucher.create({
            customerId,
            amount,
            type, // 'credit' or 'debit'
            description,
            date: date || new Date(),
            companyId: req.user.companyId
        });

        // Update Customer Balance
        const customer = await Customer.findOne({ where: { id: customerId, companyId: req.user.companyId } });
        if (customer) {
            if (type === 'credit') {
                // Payment received (reduces balance if balance is "amount owed") 
                // OR Credit given (increases balance if balance is "store credit")
                // Usually in POS:
                // Debit = Customer buys on credit (Owes more) -> Balance increases
                // Credit = Customer pays (Owes less) -> Balance decreases
                // Let's assume Balance = Amount Owed.
                // So Debit (+), Credit (-)
                customer.current_balance = parseFloat(customer.current_balance) - parseFloat(amount);
            } else if (type === 'debit') {
                customer.current_balance = parseFloat(customer.current_balance) + parseFloat(amount);
            }
            await customer.save();
        }

        res.status(201).json(newVoucher);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete voucher (revert balance?)
exports.deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const voucher = await Voucher.findOne({ where: { id, companyId: req.user.companyId } });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        // Revert balance change
        const customer = await Customer.findOne({ where: { id: voucher.customerId, companyId: req.user.companyId } });
        if (customer) {
            if (voucher.type === 'credit') {
                customer.current_balance = parseFloat(customer.current_balance) + parseFloat(voucher.amount);
            } else if (voucher.type === 'debit') {
                customer.current_balance = parseFloat(customer.current_balance) - parseFloat(voucher.amount);
            }
            await customer.save();
        }

        await voucher.destroy();
        res.json({ message: 'Voucher deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
