
const express = require('express');
const router = express.Router();
const loginAttemptLogsController = require('../controllers/loginAttemptLogsController');

router.get('/', loginAttemptLogsController.getAllLoginAttemptLogs);
router.get('/:id', loginAttemptLogsController.getLoginAttemptLogsById);
router.post('/', loginAttemptLogsController.createLoginAttemptLogs);
router.put('/:id', loginAttemptLogsController.updateLoginAttemptLogs);
router.delete('/:id', loginAttemptLogsController.deleteLoginAttemptLogs);

module.exports = router;
