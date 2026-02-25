const { User, Company } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role, companyId: user.companyId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            access_token: token,
            user_details: {
                id: user.id,
                username: user.username,
                email: user.email,
                user_role: user.role,
                companyId: user.companyId
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, currentPassword, newPassword } = req.body;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (newPassword) {
            if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

            user.password = await bcrypt.hash(newPassword, 10);
        }

        if (username) user.username = username;
        if (email) user.email = email;

        await user.save();
        res.json({ message: 'Profile updated successfully', user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                user_details: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    user_role: user.role,
                    companyId: user.companyId
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
