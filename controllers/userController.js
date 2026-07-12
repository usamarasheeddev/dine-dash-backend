const { User } = require('../models');
const bcrypt = require('bcryptjs');

exports.getStaff = async (req, res) => {
    try {
        const { search, role, status, page, limit } = req.query;
        const shouldPaginate = page !== undefined || req.query.paginate === 'true';

        const { Op } = require('sequelize');
        const whereClause = { companyId: req.user.companyId };

        if (role && role !== 'all') {
            whereClause.role = role;
        }
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        if (search) {
            whereClause[Op.or] = [
                { fullName: { [Op.iLike]: `%${search.trim()}%` } },
                { username: { [Op.iLike]: `%${search.trim()}%` } },
                { email: { [Op.iLike]: `%${search.trim()}%` } }
            ];
        }

        const queryOptions = {
            where: whereClause,
            attributes: { exclude: ['password'] },
            order: [['fullName', 'ASC'], ['username', 'ASC']]
        };

        if (shouldPaginate) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offsetNum = (pageNum - 1) * limitNum;

            const { count, rows: staff } = await User.findAndCountAll({
                ...queryOptions,
                limit: limitNum,
                offset: offsetNum
            });

            return res.json({
                staff,
                totalCount: count,
                totalPages: Math.ceil(count / limitNum),
                currentPage: pageNum
            });
        } else {
            const staff = await User.findAll(queryOptions);
            return res.json(staff);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createStaff = async (req, res) => {
    try {
        const { username, email, password, role, fullName, phone, status } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'Email already exists' });

        const newStaff = await User.create({
            username,
            email,
            password: password || '123456',
            role: role || 'cashier',
            fullName,
            phone,
            status: status || 'active',
            companyId: req.user.companyId
        });

        const staffData = newStaff.toJSON();
        delete staffData.password;

        res.status(201).json(staffData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, fullName, phone, password, status } = req.body;

        const staff = await User.findOne({ where: { id, companyId: req.user.companyId } });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        if (email && email !== staff.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) return res.status(400).json({ message: 'Email already exists' });
        }

        if (status && status === 'inactive') {
            if (staff.id === req.user.id) {
                return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
            }
            if (staff.role === 'admin' && req.user.role !== 'superadmin') {
                return res.status(400).json({ success: false, message: 'Admin accounts cannot be deactivated.' });
            }
        }

        staff.username = username || staff.username;
        staff.email = email || staff.email;
        staff.role = role || staff.role;
        staff.fullName = fullName || staff.fullName;
        staff.phone = phone || staff.phone;
        staff.status = status || staff.status;

        if (password && password.trim() !== '') {
            staff.password = password; // pre-save hook will hash it
        }

        await staff.save();

        const staffData = staff.toJSON();
        delete staffData.password;

        res.json(staffData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await User.findOne({ where: { id, companyId: req.user.companyId } });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        if (staff.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }
        if (staff.role === 'admin' && req.user.role !== 'superadmin') {
            return res.status(400).json({ success: false, message: 'Admin accounts cannot be deleted.' });
        }

        await staff.destroy();
        res.json({ message: 'Staff member removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
