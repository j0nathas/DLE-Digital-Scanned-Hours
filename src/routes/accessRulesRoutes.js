
const express = require('express');
const router = express.Router();
const accessRulesController = require('../controllers/accessRulesController');

router.get('/', accessRulesController.getAllAccessRules);
router.get('/:id', accessRulesController.getAccessRulesById);
router.post('/', accessRulesController.createAccessRules);
router.put('/:id', accessRulesController.updateAccessRules);
router.delete('/:id', accessRulesController.deleteAccessRules);

module.exports = router;
