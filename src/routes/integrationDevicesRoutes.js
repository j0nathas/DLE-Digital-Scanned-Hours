
const express = require('express');
const router = express.Router();
const integrationDevicesController = require('../controllers/integrationDevicesController');

router.get('/', integrationDevicesController.getAllIntegrationDevices);
router.get('/:id', integrationDevicesController.getIntegrationDevicesById);
router.post('/', integrationDevicesController.createIntegrationDevices);
router.put('/:id', integrationDevicesController.updateIntegrationDevices);
router.delete('/:id', integrationDevicesController.deleteIntegrationDevices);

module.exports = router;
