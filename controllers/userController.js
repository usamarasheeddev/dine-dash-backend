const { User } = require('../models');
const bcrypt = require('bcryptjs');

exports.getStaff = async (req, res) => {
    try {
        const staff = await User.findAll({
            where: {
                companyId: req.user.companyId,
            },
            attributes: { exclude: ['password'] }
        });
        res.json(staff);
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

        await staff.destroy();
        res.json({ message: 'Staff member removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
