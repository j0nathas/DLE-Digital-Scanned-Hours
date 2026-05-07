
const express = require('express');
const router = express.Router();
const floorplansController = require('../controllers/floorplansController');

router.get('/', floorplansController.getAllFloorplans);
router.get('/:id', floorplansController.getFloorplansById);
router.post('/', floorplansController.createFloorplans);
router.put('/:id', floorplansController.updateFloorplans);
router.delete('/:id', floorplansController.deleteFloorplans);

module.exports = router;
