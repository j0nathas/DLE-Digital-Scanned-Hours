
const express = require('express');
const router = express.Router();
const userAccessRulesController = require('../controllers/userAccessRulesController');

router.get('/', userAccessRulesController.getAllUserAccessRules);
router.get('/:id', userAccessRulesController.getUserAccessRulesById);
router.post('/', userAccessRulesController.createUserAccessRules);
router.put('/:id', userAccessRulesController.updateUserAccessRules);
router.delete('/:id', userAccessRulesController.deleteUserAccessRules);

module.exports = router;
