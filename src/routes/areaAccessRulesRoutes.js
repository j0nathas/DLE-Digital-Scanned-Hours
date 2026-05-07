
const express = require('express');
const router = express.Router();
const areaAccessRulesController = require('../controllers/areaAccessRulesController');

router.get('/', areaAccessRulesController.getAllAreaAccessRules);
router.get('/:id', areaAccessRulesController.getAreaAccessRulesById);
router.post('/', areaAccessRulesController.createAreaAccessRules);
router.put('/:id', areaAccessRulesController.updateAreaAccessRules);
router.delete('/:id', areaAccessRulesController.deleteAreaAccessRules);

module.exports = router;
