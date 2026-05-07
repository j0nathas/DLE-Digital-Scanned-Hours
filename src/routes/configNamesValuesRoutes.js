
const express = require('express');
const router = express.Router();
const configNamesValuesController = require('../controllers/configNamesValuesController');

router.get('/', configNamesValuesController.getAllConfigNamesValues);
router.get('/:id', configNamesValuesController.getConfigNamesValuesById);
router.post('/', configNamesValuesController.createConfigNamesValues);
router.put('/:id', configNamesValuesController.updateConfigNamesValues);
router.delete('/:id', configNamesValuesController.deleteConfigNamesValues);

module.exports = router;
