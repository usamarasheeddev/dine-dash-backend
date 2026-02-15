const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), ledgerController.getVouchers);
router.post('/', auth(), ledgerController.addVoucher);
router.delete('/:id', auth(), ledgerController.deleteVoucher);

module.exports = router;
