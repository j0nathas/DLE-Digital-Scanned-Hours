
const express = require('express');
const router = express.Router();
const vehicleAccessRulesController = require('../controllers/vehicleAccessRulesController');

router.get('/', vehicleAccessRulesController.getAllVehicleAccessRules);
router.get('/:id', vehicleAccessRulesController.getVehicleAccessRulesById);
router.post('/', vehicleAccessRulesController.createVehicleAccessRules);
router.put('/:id', vehicleAccessRulesController.updateVehicleAccessRules);
router.delete('/:id', vehicleAccessRulesController.deleteVehicleAccessRules);

module.exports = router;
