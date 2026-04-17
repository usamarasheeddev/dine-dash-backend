const { SubscriptionPlan } = require('../models');

// Get all active plans (Public for signup)
exports.getPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findAll({ where: { isActive: true } });
        res.json(plans);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new plan (Super Admin only)
exports.createPlan = async (req, res) => {
    try {
        const { name, slug, price, durationDays, features, isActive } = req.body;
        const newPlan = await SubscriptionPlan.create({
            name,
            slug,
            price,
            durationDays,
            features,
            isActive
        });
        res.status(201).json({ message: 'Plan created successfully', plan: newPlan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update an existing plan (Super Admin only)
exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await SubscriptionPlan.findByPk(id);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }
        await plan.update(req.body);
        res.json({ message: 'Plan updated successfully', plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a plan (Super Admin only - Soft delete would be better, but let's stick to true delete if requested)
exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await SubscriptionPlan.findByPk(id);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }
        await plan.destroy();
        res.json({ message: 'Plan deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
