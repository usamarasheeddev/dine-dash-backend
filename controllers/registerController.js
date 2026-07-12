'use strict';
const { RegisterSession, Order, Expense, User } = require('../models');
const { Op } = require('sequelize');

exports.getActiveSession = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const activeSession = await RegisterSession.findOne({
            where: { companyId, status: 'open' },
            include: [{ model: User, as: 'openedBy', attributes: ['id', 'fullName', 'username'] }]
        });

        if (activeSession) {
            const sessionJson = activeSession.toJSON();
            const now = new Date();

            const cashSales = await Order.sum('finalTotal', {
                where: {
                    companyId,
                    status: 'completed',
                    paymentMethod: 'cash',
                    createdAt: {
                        [Op.between]: [activeSession.openedAt, now]
                    }
                }
            }) || 0;

            const cardSales = await Order.sum('finalTotal', {
                where: {
                    companyId,
                    status: 'completed',
                    paymentMethod: 'card',
                    createdAt: {
                        [Op.between]: [activeSession.openedAt, now]
                    }
                }
            }) || 0;

            const expenses = await Expense.sum('amount', {
                where: {
                    companyId,
                    sessionId: activeSession.id
                }
            }) || 0;

            sessionJson.liveCashSales = parseFloat(cashSales);
            sessionJson.liveCardSales = parseFloat(cardSales);
            sessionJson.liveExpenses = parseFloat(expenses);
            sessionJson.liveExpectedBalance = parseFloat(activeSession.openingBalance) + parseFloat(cashSales) - parseFloat(expenses);

            return res.status(200).json(sessionJson);
        }

        return res.status(200).json(null);
    } catch (error) {
        console.error("Get Active Session Error:", error);
        res.status(500).json({ message: 'Server error retrieving active register session' });
    }
};

exports.openRegister = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const openedByUserId = req.user.id;
        const { openingBalance } = req.body;

        const activeSession = await RegisterSession.findOne({
            where: { companyId, status: 'open' }
        });

        if (activeSession) {
            return res.status(400).json({ message: 'A register session is already open.' });
        }

        const session = await RegisterSession.create({
            companyId,
            openedByUserId,
            openingBalance: parseFloat(openingBalance) || 0,
            status: 'open',
            openedAt: new Date()
        });

        res.status(201).json(session);
    } catch (error) {
        console.error("Open Register Error:", error);
        res.status(500).json({ message: 'Server error opening register session' });
    }
};

exports.closeRegister = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const closedByUserId = req.user.id;
        const { closingBalance, notes } = req.body;
        const closedAt = new Date();

        const activeSession = await RegisterSession.findOne({
            where: { companyId, status: 'open' }
        });

        if (!activeSession) {
            return res.status(404).json({ message: 'No active register session found.' });
        }

        const cashSales = await Order.sum('finalTotal', {
            where: {
                companyId,
                status: 'completed',
                paymentMethod: 'cash',
                createdAt: {
                    [Op.between]: [activeSession.openedAt, closedAt]
                }
            }
        }) || 0;

        const cardSales = await Order.sum('finalTotal', {
            where: {
                companyId,
                status: 'completed',
                paymentMethod: 'card',
                createdAt: {
                    [Op.between]: [activeSession.openedAt, closedAt]
                }
            }
        }) || 0;

        const expenses = await Expense.sum('amount', {
            where: {
                companyId,
                sessionId: activeSession.id
            }
        }) || 0;

        const expectedBalance = parseFloat(activeSession.openingBalance) + parseFloat(cashSales) - parseFloat(expenses);
        const difference = parseFloat(closingBalance) - expectedBalance;

        await activeSession.update({
            closedByUserId,
            closingBalance: parseFloat(closingBalance) || 0,
            expectedBalance,
            difference,
            totalCashSales: parseFloat(cashSales),
            totalCardSales: parseFloat(cardSales),
            totalExpenses: parseFloat(expenses),
            notes,
            status: 'closed',
            closedAt
        });

        res.status(200).json(activeSession);
    } catch (error) {
        console.error("Close Register Error:", error);
        res.status(500).json({ message: 'Server error closing register session' });
    }
};

exports.getSessionHistory = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { startDate, endDate, openedByUserId, status } = req.query;
        
        const whereClause = { companyId };
        
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        
        if (openedByUserId && openedByUserId !== 'all') {
            whereClause.openedByUserId = openedByUserId;
        }
        
        if (startDate || endDate) {
            whereClause.openedAt = {};
            if (startDate) {
                const startStr = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`;
                whereClause.openedAt[Op.gte] = new Date(startStr);
            }
            if (endDate) {
                const endStr = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
                whereClause.openedAt[Op.lte] = new Date(endStr);
            }
        }

        const sessions = await RegisterSession.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'openedBy', attributes: ['id', 'fullName', 'username'] },
                { model: User, as: 'closedBy', attributes: ['id', 'fullName', 'username'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(sessions);
    } catch (error) {
        console.error("Get Session History Error:", error);
        res.status(500).json({ message: 'Server error retrieving session history' });
    }
};

exports.getSessionDetail = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const session = await RegisterSession.findOne({
            where: { companyId, id },
            include: [
                { model: User, as: 'openedBy', attributes: ['id', 'fullName', 'username'] },
                { model: User, as: 'closedBy', attributes: ['id', 'fullName', 'username'] },
                { model: Expense, as: 'expenses', include: [{ model: User, as: 'user', attributes: ['fullName'] }] }
            ]
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        res.status(200).json(session);
    } catch (error) {
        console.error("Get Session Detail Error:", error);
        res.status(500).json({ message: 'Server error retrieving session details' });
    }
};
