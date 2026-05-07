
const express = require('express');
const router = express.Router();
const deviceRelaysFloorplansController = require('../controllers/deviceRelaysFloorplansController');

router.get('/', deviceRelaysFloorplansController.getAllDeviceRelaysFloorplans);
router.get('/:id', deviceRelaysFloorplansController.getDeviceRelaysFloorplansById);
router.post('/', deviceRelaysFloorplansController.createDeviceRelaysFloorplans);
router.put('/:id', deviceRelaysFloorplansController.updateDeviceRelaysFloorplans);
router.delete('/:id', deviceRelaysFloorplansController.deleteDeviceRelaysFloorplans);

module.exports = router;
