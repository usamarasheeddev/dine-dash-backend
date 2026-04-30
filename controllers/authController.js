const { User, Company } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/email');
const { Op } = require('sequelize');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is active
        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact your administrator.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check Company Status (Exempt superadmins)
        if (user.role !== 'superadmin' && user.companyId) {
            const company = await Company.findByPk(user.companyId);
            if (!company || company.status !== 'active') {
                return res.status(403).json({ 
                    success: false, 
                    message: `Login blocked: Your company account is ${company ? company.status : 'inactive'}. Please contact support.` 
                });
            }
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

exports.register = async (req, res) => {
    try {
        const { ServiceRequest } = require('../models');
        const { req_name, req_email, req_number, req_company_name, req_address } = req.body;

        if (!req_email || !req_company_name) {
            return res.status(400).json({ success: false, message: 'Email and Company Name are required' });
        }

        // Check if request already exists
        const existingRequest = await ServiceRequest.findOne({ where: { email: req_email } });
        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'Registration request with this email already exists' });
        }

        const newRequest = await ServiceRequest.create({
            companyName: req_company_name,
            email: req_email,
            password: 'password123', // Default since frontend form lacks password field
            phone: req_number,
            address: req_address
        });

        res.status(201).json({ success: true, message: 'Registration submitted successfully. Please wait for admin approval.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
};


exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, currentPassword, newPassword } = req.body;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (newPassword) {
            // Note: In an integrated app, checking currentPassword makes sense, 
            // but if we are just forcing a password update we can bypass it if needed.
            // Sticking with original check for security.
            if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

            // Note: The beforeUpdate hook hashes the password if we pass it in plain text
            // Don't hash it twice! The hook checks if user.changed('password')
            user.password = newPassword;
        }

        if (username) user.username = username;
        if (req.body.fullName) user.fullName = req.body.fullName;
        if (req.body.phone) user.phone = req.body.phone;
        if (email) user.email = email;

        await user.save();
        res.json({ message: 'Profile updated successfully', user: { id: user.id, username: user.username, fullName: user.fullName, phone: user.phone, email: user.email } });
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

        // Check if user is active
        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Access denied: Your account is inactive.' });
        }

        // Check Company Status (Exempt superadmins)
        if (user.role !== 'superadmin' && user.companyId) {
            const company = await Company.findByPk(user.companyId);
            if (!company || company.status !== 'active') {
                return res.status(403).json({ 
                    success: false, 
                    message: `Access blocked: Your company account is ${company ? company.status : 'inactive'}. Please contact support.` 
                });
            }
        }

        res.json({
            success: true,
            data: {
                user_details: {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName || '',
                    phone: user.phone || '',
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

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'There is no user with that email address.' });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash token before saving to database for security
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // Dynamically get the origin URL to support both PointOfSale and SuperAdmin frontend panels
        const resetURL = `${req.headers.origin}/reset-password/${resetToken}`;

        const { getForgotPasswordTemplate } = require('../utils/emailTemplates');

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request - DineDash POS',
                html: getForgotPasswordTemplate(resetURL)
            });

            res.status(200).json({ success: true, message: 'Email sent' });
        } catch (err) {
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            return res.status(500).json({ success: false, message: 'Email could not be sent' });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            where: {
                resetPasswordToken,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Token is invalid or has expired' });
        }

        // Set new password
        user.password = req.body.password; // Note: beforeUpdate hook in model will hash it again if changed
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
