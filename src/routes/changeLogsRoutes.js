
const express = require('express');
const router = express.Router();
const changeLogsController = require('../controllers/changeLogsController');

router.get('/', changeLogsController.getAllChangeLogs);
router.get('/:id', changeLogsController.getChangeLogsById);
router.post('/', changeLogsController.createChangeLogs);
router.put('/:id', changeLogsController.updateChangeLogs);
router.delete('/:id', changeLogsController.deleteChangeLogs);

module.exports = router;
