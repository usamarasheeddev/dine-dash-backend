const jwt = require('jsonwebtoken');

module.exports = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
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

            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
            }

            next();
        } catch (err) {
            res.status(401).json({ message: 'Token is not valid' });
        }
    };
};
