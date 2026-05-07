
const express = require('express');
const router = express.Router();
const parkingSpotsController = require('../controllers/parkingSpotsController');

router.get('/', parkingSpotsController.getAllParkingSpots);
router.get('/:id', parkingSpotsController.getParkingSpotsById);
router.post('/', parkingSpotsController.createParkingSpots);
router.put('/:id', parkingSpotsController.updateParkingSpots);
router.delete('/:id', parkingSpotsController.deleteParkingSpots);

module.exports = router;
