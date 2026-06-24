const { Expense, User } = require('../models');

exports.getExpenses = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const expenses = await Expense.findAll({
            where: { companyId },
            include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'username'] }],
            order: [['expenseDate', 'DESC']]
        });
        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Server error retrieving expenses' });
    }
};

exports.createExpense = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const { category, amount, description, expenseDate } = req.body;

        const { RegisterSession } = require('../models');
        const activeSession = await RegisterSession.findOne({
            where: { companyId, status: 'open' }
        });

        const expense = await Expense.create({
            companyId,
            userId,
            category,
            amount,
            description,
            expenseDate: expenseDate || new Date(),
            sessionId: activeSession ? activeSession.id : null
        });

        // Fetch it again to include the user
        const newExpense = await Expense.findByPk(expense.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'username'] }]
        });

        res.status(201).json(newExpense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ message: 'Server error creating expense' });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const expense = await Expense.findOne({ where: { id, companyId } });
        if (!expense) return res.status(404).json({ message: 'Expense not found' });

        await expense.destroy();
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Server error deleting expense' });
    }
};
