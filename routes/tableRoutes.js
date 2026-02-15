const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth(), tableController.getTables);
router.post('/', auth(), tableController.addTable);
router.put('/:id', auth(), tableController.updateTable);
router.delete('/:id', auth(), tableController.deleteTable);

module.exports = router;
