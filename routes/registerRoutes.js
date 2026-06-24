const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');
const auth = require('../middleware/authMiddleware');

router.use(auth());

router.get('/active', registerController.getActiveSession);
router.post('/open', registerController.openRegister);
router.post('/close', registerController.closeRegister);
router.get('/history', registerController.getSessionHistory);
router.get('/history/:id', registerController.getSessionDetail);

module.exports = router;
