
const express = require('express');
const router = express.Router();
const operatorTypeModulesController = require('../controllers/operatorTypeModulesController');

router.get('/', operatorTypeModulesController.getAllOperatorTypeModules);
router.get('/:id', operatorTypeModulesController.getOperatorTypeModulesById);
router.post('/', operatorTypeModulesController.createOperatorTypeModules);
router.put('/:id', operatorTypeModulesController.updateOperatorTypeModules);
router.delete('/:id', operatorTypeModulesController.deleteOperatorTypeModules);

module.exports = router;
