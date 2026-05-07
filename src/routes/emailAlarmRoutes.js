
const express = require('express');
const router = express.Router();
const emailAlarmController = require('../controllers/emailAlarmController');

router.get('/', emailAlarmController.getAllEmailAlarm);
router.get('/:id', emailAlarmController.getEmailAlarmById);
router.post('/', emailAlarmController.createEmailAlarm);
router.put('/:id', emailAlarmController.updateEmailAlarm);
router.delete('/:id', emailAlarmController.deleteEmailAlarm);

module.exports = router;
