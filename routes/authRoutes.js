const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.get('/getUser', auth(), authController.getUser);
router.put('/auth/update', auth(), authController.updateProfile);

module.exports = router;
