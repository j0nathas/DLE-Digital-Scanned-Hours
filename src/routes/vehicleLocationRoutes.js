
const express = require('express');
const router = express.Router();
const vehicleLocationController = require('../controllers/vehicleLocationController');

router.get('/', vehicleLocationController.getAllVehicleLocation);
router.get('/:id', vehicleLocationController.getVehicleLocationById);
router.post('/', vehicleLocationController.createVehicleLocation);
router.put('/:id', vehicleLocationController.updateVehicleLocation);
router.delete('/:id', vehicleLocationController.deleteVehicleLocation);

module.exports = router;
