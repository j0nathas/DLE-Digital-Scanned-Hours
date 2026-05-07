
const express = require('express');
const router = express.Router();
const operatorTypeGroupsController = require('../controllers/operatorTypeGroupsController');

router.get('/', operatorTypeGroupsController.getAllOperatorTypeGroups);
router.get('/:id', operatorTypeGroupsController.getOperatorTypeGroupsById);
router.post('/', operatorTypeGroupsController.createOperatorTypeGroups);
router.put('/:id', operatorTypeGroupsController.updateOperatorTypeGroups);
router.delete('/:id', operatorTypeGroupsController.deleteOperatorTypeGroups);

module.exports = router;
