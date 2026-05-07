
const express = require('express');
const router = express.Router();
const emailRulesController = require('../controllers/emailRulesController');

router.get('/', emailRulesController.getAllEmailRules);
router.get('/:id', emailRulesController.getEmailRulesById);
router.post('/', emailRulesController.createEmailRules);
router.put('/:id', emailRulesController.updateEmailRules);
router.delete('/:id', emailRulesController.deleteEmailRules);

module.exports = router;
