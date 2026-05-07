
const express = require('express');
const router = express.Router();
const devicesController = require('../controllers/devicesController');

router.get('/', devicesController.getAllDevices);
router.get('/:id', devicesController.getDevicesById);
router.post('/', devicesController.createDevices);
router.put('/:id', devicesController.updateDevices);
router.delete('/:id', devicesController.deleteDevices);

module.exports = router;
