const { Branch, Company } = require('../models');

// Get all branches for a company
exports.getBranches = async (req, res) => {
    try {
        const branches = await Branch.findAll({ where: { companyId: req.user.companyId } });
        res.json(branches);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a new branch
exports.addBranch = async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        const newBranch = await Branch.create({
            name,
            address,
            phone,
            companyId: req.user.companyId
        });
        res.status(201).json(newBranch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update a branch
exports.updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, status } = req.body;
        const branch = await Branch.findOne({ where: { id, companyId: req.user.companyId } });

        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        branch.name = name || branch.name;
        branch.address = address || branch.address;
        branch.phone = phone || branch.phone;
        branch.status = status || branch.status;

        await branch.save();
        res.json(branch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a branch (or deactivate)
exports.deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const branch = await Branch.findOne({ where: { id, companyId: req.user.companyId } });

        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        await branch.destroy();
        res.json({ message: 'Branch deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
