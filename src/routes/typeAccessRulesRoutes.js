
const express = require('express');
const router = express.Router();
const typeAccessRulesController = require('../controllers/typeAccessRulesController');

router.get('/', typeAccessRulesController.getAllTypeAccessRules);
router.get('/:id', typeAccessRulesController.getTypeAccessRulesById);
router.post('/', typeAccessRulesController.createTypeAccessRules);
router.put('/:id', typeAccessRulesController.updateTypeAccessRules);
router.delete('/:id', typeAccessRulesController.deleteTypeAccessRules);

module.exports = router;
