
const express = require('express');
const router = express.Router();
const logMessagesController = require('../controllers/logMessagesController');

router.get('/', logMessagesController.getAllLogMessages);
router.get('/:id', logMessagesController.getLogMessagesById);
router.post('/', logMessagesController.createLogMessages);
router.put('/:id', logMessagesController.updateLogMessages);
router.delete('/:id', logMessagesController.deleteLogMessages);

module.exports = router;
