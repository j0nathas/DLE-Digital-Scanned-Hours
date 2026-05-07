
const express = require('express');
const router = express.Router();
const parkingAccessRulesController = require('../controllers/parkingAccessRulesController');

router.get('/', parkingAccessRulesController.getAllParkingAccessRules);
router.get('/:id', parkingAccessRulesController.getParkingAccessRulesById);
router.post('/', parkingAccessRulesController.createParkingAccessRules);
router.put('/:id', parkingAccessRulesController.updateParkingAccessRules);
router.delete('/:id', parkingAccessRulesController.deleteParkingAccessRules);

module.exports = router;
