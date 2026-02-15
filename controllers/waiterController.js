const { Waiter, Branch } = require('../models');

exports.getWaiters = async (req, res) => {
    try {
        const whereClause = { companyId: req.user.companyId };
        if (req.query.branchId) {
            whereClause.branchId = req.query.branchId;
        }
        const waiters = await Waiter.findAll({
            where: whereClause,
            include: [{ model: Branch, as: 'branch' }]
        });
        res.json(waiters);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addWaiter = async (req, res) => {
    try {
        const { name, phone, cnic, address, branchId } = req.body;
        const newWaiter = await Waiter.create({
            name,
            phone,
            cnic,
            address,
            branchId,
            companyId: req.user.companyId
        });
        res.status(201).json(newWaiter);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateWaiter = async (req, res) => {
    try {
        const { id } = req.params;
        const waiter = await Waiter.findOne({ where: { id, companyId: req.user.companyId } });
        if (!waiter) {
            return res.status(404).json({ message: 'Waiter not found' });
        }
        await waiter.update(req.body);
        res.json(waiter);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteWaiter = async (req, res) => {
    try {
        const { id } = req.params;
        const waiter = await Waiter.findOne({ where: { id, companyId: req.user.companyId } });
        if (!waiter) {
            return res.status(404).json({ message: 'Waiter not found' });
        }
        await waiter.destroy();
        res.json({ message: 'Waiter deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
