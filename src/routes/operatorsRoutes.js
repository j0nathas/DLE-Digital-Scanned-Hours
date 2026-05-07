
const express = require('express');
const router = express.Router();
const operatorsController = require('../controllers/operatorsController');

router.get('/', operatorsController.getAllOperators);
router.get('/:id', operatorsController.getOperatorsById);
router.post('/', operatorsController.createOperators);
router.put('/:id', operatorsController.updateOperators);
router.delete('/:id', operatorsController.deleteOperators);

module.exports = router;
