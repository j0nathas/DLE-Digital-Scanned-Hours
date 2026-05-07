
const express = require('express');
const router = express.Router();
const identificationRulesController = require('../controllers/identificationRulesController');

router.get('/', identificationRulesController.getAllIdentificationRules);
router.get('/:id', identificationRulesController.getIdentificationRulesById);
router.post('/', identificationRulesController.createIdentificationRules);
router.put('/:id', identificationRulesController.updateIdentificationRules);
router.delete('/:id', identificationRulesController.deleteIdentificationRules);

module.exports = router;
