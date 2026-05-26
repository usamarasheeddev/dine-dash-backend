const { Company, User, ServiceRequest, SubscriptionPlan, SubscriptionTransaction, sequelize, Branch } = require('../models');
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

        const totalRevenue = await SubscriptionTransaction.sum('amount') || 0;

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

        // Exclude superadmins generally from this count to get true active customer users
        const totalUsers = await User.count({ where: { role: { [Op.ne]: 'superadmin' } } });

        res.json({
            totalCompanies,
            activeCompanies,
            disabledCompanies,
            totalRevenue,
            expiringSoon,
            pendingRequests,
            totalUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching stats', error: error.message });
    }
};

// Update Company (Super Admin only)
exports.updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, subscriptionPlan } = req.body;

        const company = await Company.findByPk(id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const updates = {};
        if (status) updates.status = status;

        if (subscriptionPlan) {
            const priceMap = { 'basic': 50, 'premium': 150, 'enterprise': 500 };
            const planPrice = priceMap[subscriptionPlan] || priceMap['basic'];
            updates.subscriptionPlan = subscriptionPlan;
            updates.subscriptionPrice = planPrice;

            // Adjust expiry if plan upgrades - simple logic to reset 30 days for now
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            updates.expiryDate = expiry;
            
            // Log transaction for plan update
            await SubscriptionTransaction.create({
                companyId: company.id,
                planName: subscriptionPlan,
                amount: planPrice,
                type: 'activation',
                status: 'completed',
                notes: `Plan updated manually by SuperAdmin.`
            });
        }

        await company.update(updates);

        res.json({ message: 'Company updated successfully', company });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating company', error: error.message });
    }
};

// Get My Settings (Current logged in user's company)
exports.getMySettings = async (req, res) => {
    try {
        const company = await Company.findByPk(req.user.companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching company settings', error: error.message });
    }
};

// Update My Settings (Current logged in user's company - Admin only)
exports.updateMySettings = async (req, res) => {
    try {
        // Allow cashier as well since it's the default role for testing
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'cashier') {
            return res.status(403).json({ message: 'Not authorized to update company settings' });
        }

        const company = await Company.findByPk(req.user.companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const allowedFields = [
            'name', 'address', 'phone', 'phone2',
            'currency', 'timezone', 'taxRate',
            'receiptHeader', 'receiptFooter',
            'orderTypes', 'kitchenEnabled',
            'silentPrintingEnabled', 'selectedPrinter'
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        await company.update(updates);
        res.json({ message: 'Company settings updated successfully', company });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating company settings', error: error.message });
    }
};

// Renew Subscription (Restricted to Super Admin as per request)
exports.renewSubscription = async (req, res) => {
    try {
        // Enforce superadmin only for renewal
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Only Super Admin can activate or renew subscriptions.' });
        }

        const companyId = req.params.id || req.user.companyId;
        const company = await Company.findByPk(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const plan = await SubscriptionPlan.findOne({ where: { name: company.subscriptionPlan } });
        const price = plan ? plan.price : company.subscriptionPrice;
        const duration = plan ? plan.durationDays : 30;

        // Logic: If already expired, start from now. If not, append to current expiry.
        let currentExpiry = company.expiryDate ? new Date(company.expiryDate) : new Date();
        let newExpiry = new Date();
        
        if (currentExpiry > new Date()) {
            newExpiry = currentExpiry;
        }
        
        newExpiry.setDate(newExpiry.getDate() + duration);

        await company.update({
            expiryDate: newExpiry,
            subscriptionPrice: price,
            status: 'active'
        });

        // Log transaction for renewal
        await SubscriptionTransaction.create({
            companyId: company.id,
            planName: company.subscriptionPlan,
            amount: price,
            type: 'renewal',
            status: 'completed',
            notes: `Manual renewal by SuperAdmin.`
        });

        res.json({ 
            message: 'Subscription renewed successfully', 
            expiryDate: newExpiry,
            subscriptionPlan: company.subscriptionPlan
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error renewing subscription', error: error.message });
    }
};

// Get Company by ID with all details (Super Admin only)
exports.getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findByPk(id, {
            include: [
                { model: User, as: 'users', attributes: { exclude: ['password'] } },
                { model: Branch, as: 'branches' },
                { model: SubscriptionTransaction, as: 'transactions' }
            ],
            order: [
                [{ model: SubscriptionTransaction, as: 'transactions' }, 'createdAt', 'DESC']
            ]
        });

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        res.json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching company details', error: error.message });
    }
};
