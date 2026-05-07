
const express = require('express');
const router = express.Router();
const modeIdentificationRulesController = require('../controllers/modeIdentificationRulesController');

router.get('/', modeIdentificationRulesController.getAllModeIdentificationRules);
router.get('/:id', modeIdentificationRulesController.getModeIdentificationRulesById);
router.post('/', modeIdentificationRulesController.createModeIdentificationRules);
router.put('/:id', modeIdentificationRulesController.updateModeIdentificationRules);
router.delete('/:id', modeIdentificationRulesController.deleteModeIdentificationRules);

module.exports = router;
