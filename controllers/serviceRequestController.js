const { ServiceRequest, Company, User, SubscriptionPlan, SubscriptionTransaction, sequelize } = require('../models');
const sendEmail = require('../utils/email');
const {
    getServiceRequestConfirmationTemplate,
    getAdminNotificationTemplate,
    getServiceApprovalTemplate
} = require('../utils/emailTemplates');

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

        // Send Confirmation Email to Applicant
        try {
            await sendEmail({
                email: email,
                subject: 'Request Received - DineDash',
                html: getServiceRequestConfirmationTemplate(companyName)
            });
        } catch (mailError) {
            console.error('Initial mail notification failed to applicant:', mailError);
        }

        // Send Notification to Super Admin
        try {
            await sendEmail({
                email: process.env.SMTP_USER || 'dinedashpos@gmail.com',
                subject: `New Service Request: ${companyName}`,
                html: getAdminNotificationTemplate({ companyName, email, phone, address })
            });
        } catch (mailError) {
            console.error('Initial mail notification failed to super admin:', mailError);
        }

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
        const { status, planSlug, trialDays } = req.body; // 'approved' or 'rejected'

        const request = await ServiceRequest.findByPk(id);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (status === 'approved' && request.status !== 'approved') {
            let planName = 'basic';
            let planPrice = 50;
            let duration = 30;

            if (planSlug) {
                const plan = await SubscriptionPlan.findOne({ where: { slug: planSlug } });
                if (plan) {
                    planName = plan.name;
                    planPrice = plan.price;
                    duration = plan.durationDays;
                }
            }

            // trialDays override if provided
            if (trialDays) {
                duration = parseInt(trialDays);
                planPrice = 0; // Trials are free
                planName = 'trial';
            }

            const expiry = new Date();
            expiry.setDate(expiry.getDate() + duration);

            const company = await Company.create({
                name: request.companyName,
                email: request.email,
                status: 'active',
                subscriptionPlan: planName,
                subscriptionPrice: planPrice,
                expiryDate: expiry,
                address: request.address,
                phone: request.phone
            }, { transaction });

            // Generate a random secure password
            const generatedPassword = Math.random().toString(36).slice(-10) + Math.floor(Math.random() * 1000);

            await User.create({
                username: 'Admin',
                email: request.email,
                password: generatedPassword, // This will be hashed by the User beforeCreate hook
                role: 'admin',
                companyId: company.id
            }, { transaction });

            // Log the initial transaction for revenue tracking
            if (planPrice > 0) {
                await SubscriptionTransaction.create({
                    companyId: company.id,
                    planName: planName,
                    amount: planPrice,
                    type: 'activation',
                    status: 'completed',
                    notes: `Initial subscription on approval of service request.`
                }, { transaction });
            }

            emailData = {
                from: process.env.EMAIL_USER || 'no-reply@martpos.com',
                to: request.email,
                subject: 'Account Approved - DineDash',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #4f46e5;">Welcome to DineDash</h2>
                        <p>Hello,</p>
                        <p>Your service request for <strong>${request.companyName}</strong> has been approved!</p>
                        <p>You can now access your dashboard using the following credentials:</p>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${request.email}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #eee; padding: 2px 4px; border-radius: 4px;">${generatedPassword}</code></p>
                        </div>
                        <p><strong>Subscription Details:</strong></p>
                        <ul>
                            <li>Plan: ${planName.toUpperCase()}</li>
                            <li>Expires on: ${expiry.toLocaleDateString()}</li>
                        </ul>
                        <p style="color: #ef4444; font-size: 0.9em;"><em>Note: Please change your password immediately after your first login for security.</em></p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 0.8em; color: #6b7280; text-align: center;">© ${new Date().getFullYear()} DineDash. All rights reserved.</p>
                    </div>
                `
            };

            request.status = 'approved';
            await request.save({ transaction });
        } else if (status === 'rejected') {
            request.status = 'rejected';
            await request.save({ transaction });
        }

        await transaction.commit();

        // Send Approval Email to Applicant
        if (emailData) {
            try {
                await sendEmail({
                    email: emailData.to,
                    subject: 'Welcome to DineDash - Account Approved!',
                    html: getServiceApprovalTemplate(request.companyName)
                });
            } catch (mailError) {
                console.error('Approval email failed to send:', mailError);
            }
        }

        res.json({ message: `Request ${status} successfully` });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
