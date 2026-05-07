
const express = require('express');
const router = express.Router();
const schedulAccessRulesController = require('../controllers/schedulAccessRulesController');

router.get('/', schedulAccessRulesController.getAllSchedulAccessRules);
router.get('/:id', schedulAccessRulesController.getSchedulAccessRulesById);
router.post('/', schedulAccessRulesController.createSchedulAccessRules);
router.put('/:id', schedulAccessRulesController.updateSchedulAccessRules);
router.delete('/:id', schedulAccessRulesController.deleteSchedulAccessRules);

module.exports = router;
