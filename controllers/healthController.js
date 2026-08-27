const { sequelize } = require('../models');

/**
 * @desc Keep DB alive by performing a SQL ping query
 * @route GET /api/keep-alive
 * @access Public
 */
exports.keepAlive = async (req, res) => {
    const startTime = Date.now();
    try {
        // Execute a simple query to keep Aiven DB active
        await sequelize.query('SELECT 1 + 1 AS keep_alive;');
        const responseTimeMs = Date.now() - startTime;

        return res.status(200).json({
            status: 'success',
            message: 'Database pinged successfully and is active.',
            db: 'connected',
            responseTimeMs: `${responseTimeMs}ms`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Keep-alive DB ping failed:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to connect to database.',
            db: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
