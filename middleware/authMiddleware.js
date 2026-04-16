const jwt = require('jsonwebtoken');

module.exports = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return async (req, res, next) => {
        let token = req.header('x-auth-token');
        const authHeader = req.header('Authorization');

        if (!token && authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            req.user = decoded;

            // Check Company Status (Exempt superadmins)
            if (req.user.role !== 'superadmin' && req.user.companyId) {
                const { Company } = require('../models');
                const company = await Company.findByPk(req.user.companyId);
                if (!company || company.status !== 'active') {
                    return res.status(403).json({ 
                        success: false, 
                        message: `Access blocked: Your company account is ${company ? company.status : 'inactive'}. Please contact support.` 
                    });
                }
            }

            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
            }

            next();
        } catch (err) {
            res.status(401).json({ message: 'Token is not valid' });
        }
    };
};
