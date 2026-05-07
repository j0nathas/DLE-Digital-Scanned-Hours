
const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');

router.get('/', logsController.getAllLogs);
router.get('/:id', logsController.getLogsById);
router.post('/', logsController.createLogs);
router.put('/:id', logsController.updateLogs);
router.delete('/:id', logsController.deleteLogs);

module.exports = router;
