
const express = require('express');
const router = express.Router();
const operatorTypesController = require('../controllers/operatorTypesController');

router.get('/', operatorTypesController.getAllOperatorTypes);
router.get('/:id', operatorTypesController.getOperatorTypesById);
router.post('/', operatorTypesController.createOperatorTypes);
router.put('/:id', operatorTypesController.updateOperatorTypes);
router.delete('/:id', operatorTypesController.deleteOperatorTypes);

module.exports = router;
