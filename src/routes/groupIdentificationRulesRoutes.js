
const express = require('express');
const router = express.Router();
const groupIdentificationRulesController = require('../controllers/groupIdentificationRulesController');

router.get('/', groupIdentificationRulesController.getAllGroupIdentificationRules);
router.get('/:id', groupIdentificationRulesController.getGroupIdentificationRulesById);
router.post('/', groupIdentificationRulesController.createGroupIdentificationRules);
router.put('/:id', groupIdentificationRulesController.updateGroupIdentificationRules);
router.delete('/:id', groupIdentificationRulesController.deleteGroupIdentificationRules);

module.exports = router;
