const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'https://dine-dash-pos.vercel.app',
        'https://dine-dash-pos-five.vercel.app',
        'https://pos-dine-dash.vercel.app'
    ],
    credentials: true
}));
app.use(express.json());

// Health Check & Keep Alive Routes
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'online',
        message: 'DineDash API is running',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/keep-alive', require('./routes/keepAliveRoutes'));
app.use('/api/health', require('./routes/keepAliveRoutes'));

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
app.use('/api/recipes', require('./routes/recipeRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/subscription-plans', require('./routes/subscriptionPlanRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/register', require('./routes/registerRoutes'));


// Database Connection and Server Start
if (process.env.NODE_ENV !== 'production') {
    sequelize.authenticate()
        .then(() => {
            console.log('Database connected!');
            return sequelize.sync({ alter: true });
        })
        .then(() => {
            console.log('✅ Database schemas synced successfully!');
        })
        .catch(err => {
            console.error('Database connection failed:', err);
        });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
