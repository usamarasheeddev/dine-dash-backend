const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), customerController.getCustomers);
router.get('/:id', auth(), customerController.getCustomerById);
router.post('/', auth(), customerController.addCustomer);
router.put('/:id', auth(), customerController.updateCustomer);
router.delete('/:id', auth(), customerController.deleteCustomer);
router.post('/:id/ledger', auth(), customerController.addLedgerEntry);

module.exports = router;
