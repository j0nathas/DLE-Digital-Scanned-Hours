
const express = require('express');
const router = express.Router();
const deviceAccessRulesController = require('../controllers/deviceAccessRulesController');

router.get('/', deviceAccessRulesController.getAllDeviceAccessRules);
router.get('/:id', deviceAccessRulesController.getDeviceAccessRulesById);
router.post('/', deviceAccessRulesController.createDeviceAccessRules);
router.put('/:id', deviceAccessRulesController.updateDeviceAccessRules);
router.delete('/:id', deviceAccessRulesController.deleteDeviceAccessRules);

module.exports = router;
