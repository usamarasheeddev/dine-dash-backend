const { ServiceRequest, Company, User, sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Submit a new service request
exports.submitRequest = async (req, res) => {
    try {
        const { companyName, email, password, phone, address } = req.body;

        // Check if request already exists
        const existingRequest = await ServiceRequest.findOne({ where: { email } });
        if (existingRequest) {
            return res.status(400).json({ message: 'Request with this email already exists' });
        }

        const newRequest = await ServiceRequest.create({
            companyName,
            email,
            password,
            phone,
            address
        });

        res.status(201).json({ message: 'Service request submitted successfully', request: newRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all service requests (Super Admin only)
exports.getAllRequests = async (req, res) => {
    try {
        const requests = await ServiceRequest.findAll();
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update request status (Approve/Reject)
exports.updateRequestStatus = async (req, res) => {
    const transaction = await sequelize.transaction();
    let emailData = null;
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        const request = await ServiceRequest.findByPk(id);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (status === 'approved' && request.status !== 'approved') {
            const priceMap = { 'basic': 50, 'premium': 150, 'enterprise': 500 };
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);

            const company = await Company.create({
                name: request.companyName,
                email: request.email,
                status: 'active',
                subscriptionPlan: 'basic', // Default plan for requests
                subscriptionPrice: priceMap['basic'],
                expiryDate: expiry
            }, { transaction });

            // Generate a random secure password
            const generatedPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 1000);

            await User.create({
                username: 'Admin',
                email: request.email,
                password: generatedPassword, // This will be hashed by the User beforeCreate hook
                role: 'admin',
                companyId: company.id
            }, { transaction });

            emailData = {
                from: process.env.EMAIL_USER || 'no-reply@martpos.com',
                to: request.email,
                subject: 'Account Approved - Mart POS',
                html: `<h3>Welcome to Mart POS</h3><p>Your request for <b>${request.companyName}</b> has been approved!</p><p>You can now log in using these credentials:</p><p><b>Email:</b> ${request.email}<br/><b>Password:</b> ${generatedPassword}</p><p><i>Please change your password immediately after logging in.</i></p>`
            };

            request.status = 'approved';
            await request.save({ transaction });
        } else if (status === 'rejected') {
            request.status = 'rejected';
            await request.save({ transaction });
        }

        await transaction.commit();

        if (emailData) {
            transporter.sendMail(emailData, function (error, info) {
                if (error) {
                    console.error('Error sending email:', error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        }

        res.json({ message: `Request ${status} successfully` });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
