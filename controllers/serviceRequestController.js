const { ServiceRequest, Company, User, sequelize } = require('../models');
const bcrypt = require('bcryptjs');

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
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        const request = await ServiceRequest.findByPk(id);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (status === 'approved' && request.status !== 'approved') {
            // Create Company
            const company = await Company.create({
                name: request.companyName,
                email: request.email,
                status: 'active'
            }, { transaction });

            // Create Admin User for the company
            // Password is already hashed in ServiceRequest hooked, but we need to re-hash or copy?
            // Actually, standard practice: use the password provided.
            // Wait, ServiceRequest password is hashed in the hook.
            // So request.password is a hash.
            // User model also hashes on beforeCreate.
            // If we pass the hashed password to User.create, it will be hashed AGAIN.
            // We should disable the hook or handle this.
            // OR, we can just set the password directly and silence the hook if possible, or just accept double hashing is bad.
            // Better approach: User the raw password if we had it, but we don't.
            // Workaround: We will update the User record directly or use a flag.
            // For now, let's assume we can just pass it and we need to avoid double hashing.
            // Let's create the user with a temporary password and then update it with the hashed one, avoiding the hook?
            // Or better, just don't hash in ServiceRequest? No, we should protect it.
            // Let's rely on the fact that we can pass `hooks: false` to User.create.

            await User.create({
                username: 'Admin',
                email: request.email,
                password: request.password, // This is already hashed
                role: 'admin',
                companyId: company.id
            }, { transaction, hooks: false }); // Disable hooks to prevent double hashing

            request.status = 'approved';
            await request.save({ transaction });
        } else if (status === 'rejected') {
            request.status = 'rejected';
            await request.save({ transaction });
        }

        await transaction.commit();
        res.json({ message: `Request ${status} successfully` });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
