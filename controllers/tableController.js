const { Table, Branch } = require('../models');

// Get all tables for a branch/company
exports.getTables = async (req, res) => {
    try {
        const whereClause = { companyId: req.user.companyId };
        if (req.query.branchId) {
            whereClause.branchId = req.query.branchId;
        }

        const tables = await Table.findAll({
            where: whereClause,
            include: [{ model: Branch, as: 'branch' }]
        });
        res.json(tables);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addTable = async (req, res) => {
    try {
        const { tableNo, capacity, location, branchId } = req.body;
        const newTable = await Table.create({
            tableNo,
            capacity,
            location,
            branchId,
            companyId: req.user.companyId,
            status: 'available'
        });
        res.status(201).json(newTable);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const table = await Table.findOne({ where: { id, companyId: req.user.companyId } });

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        await table.update(req.body);
        res.json(table);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteTable = async (req, res) => {
    try {
        const { id } = req.params;
        const table = await Table.findOne({ where: { id, companyId: req.user.companyId } });

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        await table.destroy();
        res.json({ message: 'Table deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
