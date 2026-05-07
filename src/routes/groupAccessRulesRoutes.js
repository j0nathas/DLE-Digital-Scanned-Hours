
const express = require('express');
const router = express.Router();
const groupAccessRulesController = require('../controllers/groupAccessRulesController');

router.get('/', groupAccessRulesController.getAllGroupAccessRules);
router.get('/:id', groupAccessRulesController.getGroupAccessRulesById);
router.post('/', groupAccessRulesController.createGroupAccessRules);
router.put('/:id', groupAccessRulesController.updateGroupAccessRules);
router.delete('/:id', groupAccessRulesController.deleteGroupAccessRules);

module.exports = router;
