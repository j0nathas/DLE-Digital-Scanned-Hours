
const express = require('express');
const router = express.Router();
const configFieldsValuesController = require('../controllers/configFieldsValuesController');

router.get('/', configFieldsValuesController.getAllConfigFieldsValues);
router.get('/:id', configFieldsValuesController.getConfigFieldsValuesById);
router.post('/', configFieldsValuesController.createConfigFieldsValues);
router.put('/:id', configFieldsValuesController.updateConfigFieldsValues);
router.delete('/:id', configFieldsValuesController.deleteConfigFieldsValues);

module.exports = router;
