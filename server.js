const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://localhost:8080'],
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/service-requests', require('./routes/serviceRequestRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/tables', require('./routes/tableRoutes'));
app.use('/api/waiters', require('./routes/waiterRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/ledgers', require('./routes/ledgerRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/subscription-plans', require('./routes/subscriptionPlanRoutes'));


// Database Connection and Server Start
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await sequelize.authenticate();
        console.log('Database connected!');
        await sequelize.sync({ alter: true });
        console.log('Database schemas synced!');
    } catch (err) {
        console.error('Database connection failed:', err);
    }
});
