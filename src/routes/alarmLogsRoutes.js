
const express = require('express');
const router = express.Router();
const alarmLogsController = require('../controllers/alarmLogsController');

router.get('/', alarmLogsController.getAllAlarmLogs);
router.get('/:id', alarmLogsController.getAlarmLogsById);
router.post('/', alarmLogsController.createAlarmLogs);
router.put('/:id', alarmLogsController.updateAlarmLogs);
router.delete('/:id', alarmLogsController.deleteAlarmLogs);

module.exports = router;
