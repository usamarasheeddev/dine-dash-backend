const { Order, OrderItem, Product, InventoryItem, InventoryLedger, Company, sequelize } = require('../models');
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

exports.getFinanceSummary = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { startDate, endDate } = req.query;

        const company = await Company.findByPk(companyId);
        const tz = company?.timezone || 'UTC';

        const start = startDate ? fromZonedTime(startOfDay(toZonedTime(new Date(startDate), tz)), tz) : new Date(0);
        const end = endDate ? fromZonedTime(endOfDay(toZonedTime(new Date(endDate), tz)), tz) : new Date();

        const dateFilter = {
            companyId,
            createdAt: {
                [Op.between]: [start, end]
            }
        };

        // 1. Fetch completed orders in date range
        const orders = await Order.findAll({
            where: { ...dateFilter, status: 'completed' },
            include: [
                {
                    association: 'items',
                    include: ['product']
                }
            ]
        });

        // 2. Fetch inventory additions in date range
        const inventoryAdditions = await InventoryLedger.findAll({
            where: {
                companyId,
                type: 'addition',
                createdAt: { [Op.between]: [start, end] }
            },
            include: [{ association: 'item', attributes: ['name', 'unit'] }]
        });

        // 3. Fetch waste cost in date range
        const wasteLedgers = await InventoryLedger.findAll({
            where: {
                companyId,
                type: 'waste',
                createdAt: { [Op.between]: [start, end] }
            },
            include: [{ association: 'item', attributes: ['name', 'costPerUnit'] }]
        });

        const { Expense } = require('../models');
        // 4. Fetch manual expenses
        const manualExpenses = await Expense.findAll({
            where: {
                companyId,
                expenseDate: { [Op.between]: [start, end] }
            },
            include: [{ association: 'user', attributes: ['fullName'] }]
        });

        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalInventoryExpenses = 0;
        let totalWasteCost = 0;
        let totalManualExpenses = 0;

        const productMap = {};
        const revenueByDayMap = {};

        const isDaily = Math.abs(end - start) <= 24 * 60 * 60 * 1000;
        const dateFormat = isDaily ? "h a" : "MMM dd";

        if (isDaily) {
            const dayStart = new Date(start);
            for (let i = 0; i < 24; i++) {
                const hourTime = new Date(dayStart.getTime() + i * 60 * 60 * 1000);
                const label = formatInTimeZone(hourTime, tz, "h a");
                revenueByDayMap[label] = { day: label, revenue: 0, cogs: 0, expenses: 0, _time: hourTime.getTime() };
            }
        }

        // Aggregate orders (Revenue & COGS)
        orders.forEach(o => {
            const revenue = parseFloat(o.finalTotal || o.total || 0);
            totalRevenue += revenue;
            
            const dayKey = formatInTimeZone(new Date(o.createdAt), tz, dateFormat);
            if (!revenueByDayMap[dayKey]) revenueByDayMap[dayKey] = { day: dayKey, revenue: 0, cogs: 0, expenses: 0, _time: new Date(o.createdAt).getTime() };
            revenueByDayMap[dayKey].revenue += revenue;

            o.items.forEach(i => {
                const name = i.product ? i.product.name : 'Unknown Product';
                const qty = parseFloat(i.quantity || 0);
                const itemRev = parseFloat(i.total || 0);
                const itemCogs = parseFloat(i.costPrice || 0) * qty;

                totalCOGS += itemCogs;
                revenueByDayMap[dayKey].cogs += itemCogs;

                if (!productMap[name]) productMap[name] = { name, revenue: 0, cogs: 0, qty: 0 };
                productMap[name].revenue += itemRev;
                productMap[name].cogs += itemCogs;
                productMap[name].qty += qty;
            });
        });

        // Aggregate Inventory Purchases
        const inventoryExpensesList = [];
        inventoryAdditions.forEach(l => {
            const cost = parseFloat(l.purchaseCost || 0);
            totalInventoryExpenses += cost;
            
            const dayKey = formatInTimeZone(new Date(l.createdAt), tz, dateFormat);
            if (!revenueByDayMap[dayKey]) revenueByDayMap[dayKey] = { day: dayKey, revenue: 0, cogs: 0, expenses: 0, _time: new Date(l.createdAt).getTime() };
            revenueByDayMap[dayKey].expenses += cost;

            inventoryExpensesList.push({
                date: l.createdAt,
                itemName: l.item ? l.item.name : 'Unknown',
                qty: parseFloat(l.quantityChange || 0),
                unit: l.item ? l.item.unit : '',
                purchaseCost: cost,
                type: 'addition'
            });
        });

        // Aggregate Waste
        wasteLedgers.forEach(w => {
            const qty = Math.abs(parseFloat(w.quantityChange || 0));
            const unitCost = w.item ? parseFloat(w.item.costPerUnit || 0) : 0;
            totalWasteCost += (qty * unitCost);
        });

        // Aggregate Manual Expenses
        manualExpenses.forEach(e => {
            const cost = parseFloat(e.amount || 0);
            totalManualExpenses += cost;
            
            const dayKey = formatInTimeZone(new Date(e.expenseDate), tz, dateFormat);
            if (!revenueByDayMap[dayKey]) revenueByDayMap[dayKey] = { day: dayKey, revenue: 0, cogs: 0, expenses: 0, _time: new Date(e.expenseDate).getTime() };
            revenueByDayMap[dayKey].expenses += cost;
        });

        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalWasteCost - totalManualExpenses;

        // Format product profits
        const productProfits = Object.values(productMap).map(p => {
            const profit = p.revenue - p.cogs;
            const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
            return {
                ...p,
                profit,
                margin
            };
        }).sort((a, b) => b.profit - a.profit);

        const revenueByDay = Object.values(revenueByDayMap).sort((a,b) => (a._time || 0) - (b._time || 0));

        res.json({
            summary: {
                totalRevenue,
                totalCOGS,
                grossProfit,
                grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
                totalInventoryExpenses,
                totalWasteCost,
                totalManualExpenses,
                netProfit
            },
            revenueByDay,
            productProfits,
            inventoryExpenses: inventoryExpensesList.sort((a, b) => new Date(b.date) - new Date(a.date)),
            manualExpenses
        });
        
    } catch (error) {
        console.error("Finance Summary Error:", error);
        res.status(500).json({ message: 'Server error retrieving finance stats' });
    }
};