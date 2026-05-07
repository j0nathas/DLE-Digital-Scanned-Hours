
const express = require('express');
const router = express.Router();
const creditTypeAccessRulesController = require('../controllers/creditTypeAccessRulesController');

router.get('/', creditTypeAccessRulesController.getAllCreditTypeAccessRules);
router.get('/:id', creditTypeAccessRulesController.getCreditTypeAccessRulesById);
router.post('/', creditTypeAccessRulesController.createCreditTypeAccessRules);
router.put('/:id', creditTypeAccessRulesController.updateCreditTypeAccessRules);
router.delete('/:id', creditTypeAccessRulesController.deleteCreditTypeAccessRules);

module.exports = router;
