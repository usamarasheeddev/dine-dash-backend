const { Company, User, ServiceRequest, sequelize } = require('../models');
const { Op } = require('sequelize');

// Create a new company manually (Super Admin only)
exports.createCompany = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { companyName, companyEmail, subscriptionPlan, adminName, adminEmail, adminPassword } = req.body;

        // Check if company or user already exists
        const existingCompany = await Company.findOne({ where: { email: companyEmail } });
        if (existingCompany) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Company with this email already exists' });
        }

        const existingUser = await User.findOne({ where: { email: adminEmail } });
        if (existingUser) {
            await transaction.rollback();
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const priceMap = { 'basic': 50, 'premium': 150, 'enterprise': 500 };
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30); // 30 days default

        // Create Company
        const newCompany = await Company.create({
            name: companyName,
            email: companyEmail,
            status: 'active',
            subscriptionPlan: subscriptionPlan || 'basic',
            subscriptionPrice: priceMap[subscriptionPlan] || priceMap['basic'],
            expiryDate: expiry
        }, { transaction });

        // Create Admin User
        // User model's beforeCreate hook will handle password hashing
        const newUser = await User.create({
            username: adminName,
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            companyId: newCompany.id
        }, { transaction });

        await transaction.commit();
        res.status(201).json({
            message: 'Company and Admin created successfully',
            company: newCompany,
            admin: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all companies (Super Admin only)
exports.getAllCompanies = async (req, res) => {
    try {
        const companies = await Company.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(companies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get Dashboard Stats (Super Admin only)
exports.getDashboardStats = async (req, res) => {
    try {
        const totalCompanies = await Company.count();
        const activeCompanies = await Company.count({ where: { status: 'active' } });
        const disabledCompanies = await Company.count({ where: { status: 'disabled' } });

        const totalRevenue = await Company.sum('subscriptionPrice') || 0;

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const expiringSoon = await Company.count({
            where: {
                expiryDate: {
                    [Op.lte]: sevenDaysFromNow,
                    [Op.gte]: new Date()
                }
            }
        });

        const pendingRequests = await ServiceRequest.count({ where: { status: 'pending' } });

        res.json({
            totalCompanies,
            activeCompanies,
            disabledCompanies,
            totalRevenue,
            expiringSoon,
            pendingRequests
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching stats', error: error.message });
    }
};
