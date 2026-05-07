
const express = require('express');
const router = express.Router();
const vehicleParkingEvsController = require('../controllers/vehicleParkingEvsController');

router.get('/', vehicleParkingEvsController.getAllVehicleParkingEvs);
router.get('/:id', vehicleParkingEvsController.getVehicleParkingEvsById);
router.post('/', vehicleParkingEvsController.createVehicleParkingEvs);
router.put('/:id', vehicleParkingEvsController.updateVehicleParkingEvs);
router.delete('/:id', vehicleParkingEvsController.deleteVehicleParkingEvs);

module.exports = router;
