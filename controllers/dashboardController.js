const { Order, OrderItem, Product, InventoryItem, Company, sequelize } = require('../models');
const { Op } = require('sequelize');
const { formatInTimeZone, toZonedTime, fromZonedTime } = require('date-fns-tz');
const { startOfDay, endOfDay } = require('date-fns');

exports.getDashboardStats = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { timeframe = 'daily' } = req.query; // daily, weekly, monthly

        // Get company timezone
        const company = await Company.findByPk(companyId);
        const tz = company?.timezone || 'UTC';

        // 1. Order Stats (Revenue, Counts) - Zoned to Company Timezone
        const now = new Date();
        const todayStart = fromZonedTime(startOfDay(toZonedTime(now, tz)), tz);
        const todayEnd = fromZonedTime(endOfDay(toZonedTime(now, tz)), tz);

        // Fetch aggregate for Today
        const todayStatsQuery = await Order.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('finalTotal')), 'revenue'],
                [sequelize.literal('SUM(CASE WHEN "paymentMethod" = \'credit\' THEN "finalTotal" ELSE 0 END)'), 'credit']
            ],
            where: {
                companyId,
                status: 'completed',
                createdAt: {
                    [Op.between]: [todayStart, todayEnd]
                }
            },
            raw: true
        });

        const todayRevenue = Number(todayStatsQuery[0].revenue || 0);
        const todayCredit = Number(todayStatsQuery[0].credit || 0);
        const todayOrdersCount = await Order.count({
            where: {
                companyId,
                createdAt: {
                    [Op.between]: [todayStart, todayEnd]
                }
            }
        });

        // Fetch aggregate for All Time
        const allTimeStats = await Order.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('finalTotal')), 'revenue'],
                [sequelize.literal('SUM(CASE WHEN "paymentMethod" = \'credit\' THEN "finalTotal" ELSE 0 END)'), 'credit']
            ],
            where: {
                companyId,
                status: 'completed'
            },
            raw: true
        });

        const totalOrdersCount = await Order.count({ where: { companyId } });
        const totalCompletedCount = Number(allTimeStats[0].count || 0);
        const totalRevenue = Number(allTimeStats[0].revenue || 0);
        const totalCredit = Number(allTimeStats[0].credit || 0);
        const avgOrderValue = totalCompletedCount > 0 ? totalRevenue / totalCompletedCount : 0;

        // 2. Orders by Status
        const statusGroups = await Order.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: { companyId },
            group: ['status'],
            raw: true
        });

        const ordersByStatus = { new: 0, preparing: 0, pending: 0, completed: 0, cancelled: 0 };
        statusGroups.forEach(g => {
            ordersByStatus[g.status] = Number(g.count);
        });

        // 3. Inventory Stats
        const lowStockItems = await InventoryItem.findAll({
            where: {
                companyId,
                quantity: {
                    [Op.gt]: 0,
                    [Op.lte]: sequelize.col('minStock')
                }
            }
        });

        const outOfStockItems = await InventoryItem.findAll({
            where: {
                companyId,
                quantity: {
                    [Op.lte]: 0
                }
            }
        });

        const inventorySummary = await InventoryItem.findAll({
            attributes: [
                [sequelize.literal('SUM("quantity" * "costPerUnit")'), 'totalValue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { companyId },
            raw: true
        });

        const totalStockValue = Number(inventorySummary[0].totalValue || 0);
        const totalInventoryItems = Number(inventorySummary[0].count || 0);

        // 4. Top Selling Products
        // Using OrderItem joined with Product, filtered by completed orders
        const topProductsData = await OrderItem.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'qty'],
                [sequelize.fn('SUM', sequelize.col('OrderItem.total')), 'revenue']
            ],
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: [],
                    where: { companyId, status: 'completed' }
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['name']
                }
            ],
            group: ['product.id', 'product.name'],
            order: [[sequelize.literal('revenue'), 'DESC']],
            limit: 5,
            raw: true
        });

        const topProducts = topProductsData.map(p => ({
            name: p['product.name'],
            qty: Number(p.qty),
            revenue: Number(p.revenue)
        }));

        // 5. Revenue Graph Data (based on timeframe)
        let graphData = [];
        const dialect = sequelize.getDialect(); // Should be postgres

        if (timeframe === 'daily') {
            // Last 24 hours, grouped by hour
            const last24Hrs = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

            // Truncate by hour. We can just use UTC hours and then format them in the company timezone
            const timeExpr = sequelize.fn('date_trunc', 'hour', sequelize.col('createdAt'));
            const graphQuery = await Order.findAll({
                attributes: [
                    [timeExpr, 'time'],
                    [sequelize.fn('SUM', sequelize.col('finalTotal')), 'revenue'],
                    [sequelize.literal('SUM(CASE WHEN "paymentMethod" = \'credit\' THEN "finalTotal" ELSE 0 END)'), 'credit']
                ],
                where: {
                    companyId,
                    status: 'completed',
                    createdAt: { [Op.gte]: last24Hrs }
                },
                group: [timeExpr],
                order: [[timeExpr, 'ASC']],
                raw: true
            });

            // Fill missing hours
            const hoursMap = {};
            graphQuery.forEach(g => {
                // g.time is a Date object representing the UTC hour
                const label = formatInTimeZone(new Date(g.time), tz, 'h a');
                // Merge revenues if multiple UTC hours fall into the same local label (e.g. 30min offset timezones)
                if (!hoursMap[label]) hoursMap[label] = { revenue: 0, credit: 0 };
                hoursMap[label].revenue += Number(g.revenue);
                hoursMap[label].credit += Number(g.credit);
            });

            const nowUTC = new Date();
            for (let i = 23; i >= 0; i--) {
                const d = new Date(nowUTC.getTime() - i * 60 * 60 * 1000);
                const label = formatInTimeZone(d, tz, 'h a');
                if (!graphData.find(x => x.day === label)) {
                    graphData.push({ 
                        day: label, 
                        revenue: hoursMap[label]?.revenue || 0,
                        credit: hoursMap[label]?.credit || 0 
                    });
                }
            }

        } else if (timeframe === 'weekly') {
            // Last 7 days
            const last7Days = new Date(new Date().setDate(new Date().getDate() - 7));

            const timeExpr = sequelize.fn('date_trunc', 'day', sequelize.literal(`"Order"."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE '${tz}'`));
            const graphQuery = await Order.findAll({
                attributes: [
                    [timeExpr, 'time'],
                    [sequelize.fn('SUM', sequelize.col('finalTotal')), 'revenue'],
                    [sequelize.literal('SUM(CASE WHEN "paymentMethod" = \'credit\' THEN "finalTotal" ELSE 0 END)'), 'credit']
                ],
                where: {
                    companyId,
                    status: 'completed',
                    createdAt: { [Op.gte]: last7Days }
                },
                group: [timeExpr],
                order: [[timeExpr, 'ASC']],
                raw: true
            });

            const daysMap = {};
            graphQuery.forEach(g => {
                const dateKey = new Date(g.time);
                const label = dateKey.toLocaleDateString("en", { weekday: "short" });
                daysMap[label] = { revenue: Number(g.revenue), credit: Number(g.credit) };
            });

            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const label = d.toLocaleDateString("en", { weekday: "short" });
                graphData.push({ 
                    day: label, 
                    revenue: daysMap[label]?.revenue || 0,
                    credit: daysMap[label]?.credit || 0
                });
            }

        } else if (timeframe === 'monthly') {
            // Last 30 days
            const last30Days = new Date(new Date().setDate(new Date().getDate() - 30));

            const timeExpr = sequelize.fn('date_trunc', 'day', sequelize.literal(`"Order"."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE '${tz}'`));
            const graphQuery = await Order.findAll({
                attributes: [
                    [timeExpr, 'time'],
                    [sequelize.fn('SUM', sequelize.col('finalTotal')), 'revenue'],
                    [sequelize.literal('SUM(CASE WHEN "paymentMethod" = \'credit\' THEN "finalTotal" ELSE 0 END)'), 'credit']
                ],
                where: {
                    companyId,
                    status: 'completed',
                    createdAt: { [Op.gte]: last30Days }
                },
                group: [timeExpr],
                order: [[timeExpr, 'ASC']],
                raw: true
            });

            const daysMap = {};
            graphQuery.forEach(g => {
                const dateKey = new Date(g.time);
                // e.g., "Oct 12"
                const label = dateKey.toLocaleDateString("en", { month: "short", day: "numeric" });
                daysMap[label] = { revenue: Number(g.revenue), credit: Number(g.credit) };
            });

            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
                graphData.push({ 
                    day: label, 
                    revenue: daysMap[label]?.revenue || 0,
                    credit: daysMap[label]?.credit || 0
                });
            }
        }

        // 6. Recent Orders
        const recentOrders = await Order.findAll({
            where: { companyId },
            include: [{ association: 'customer', attributes: ['name'] }],
            order: [['createdAt', 'DESC']],
            limit: 8
        });

        res.json({
            stats: {
                todayRevenue,
                todayCredit,
                todayOrdersCount,
                totalRevenue,
                totalCredit,
                totalOrdersCount,
                totalCompletedCount,
                avgOrderValue
            },
            ordersByStatus,
            inventory: {
                lowStockItems,
                outOfStockItems,
                totalStockValue,
                totalInventoryItems
            },
            topProducts,
            graphData,
            recentOrders
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: 'Server error retrieving dashboard stats' });
    }
};
