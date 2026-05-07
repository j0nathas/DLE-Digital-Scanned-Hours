
const express = require('express');
const router = express.Router();
const userIdentificationRulesController = require('../controllers/userIdentificationRulesController');

router.get('/', userIdentificationRulesController.getAllUserIdentificationRules);
router.get('/:id', userIdentificationRulesController.getUserIdentificationRulesById);
router.post('/', userIdentificationRulesController.createUserIdentificationRules);
router.put('/:id', userIdentificationRulesController.updateUserIdentificationRules);
router.delete('/:id', userIdentificationRulesController.deleteUserIdentificationRules);

module.exports = router;
