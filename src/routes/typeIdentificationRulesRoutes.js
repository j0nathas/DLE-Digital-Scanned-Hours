
const express = require('express');
const router = express.Router();
const typeIdentificationRulesController = require('../controllers/typeIdentificationRulesController');

router.get('/', typeIdentificationRulesController.getAllTypeIdentificationRules);
router.get('/:id', typeIdentificationRulesController.getTypeIdentificationRulesById);
router.post('/', typeIdentificationRulesController.createTypeIdentificationRules);
router.put('/:id', typeIdentificationRulesController.updateTypeIdentificationRules);
router.delete('/:id', typeIdentificationRulesController.deleteTypeIdentificationRules);

module.exports = router;
