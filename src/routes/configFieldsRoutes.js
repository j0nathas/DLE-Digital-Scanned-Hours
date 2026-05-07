
const express = require('express');
const router = express.Router();
const configFieldsController = require('../controllers/configFieldsController');

router.get('/', configFieldsController.getAllConfigFields);
router.get('/:id', configFieldsController.getConfigFieldsById);
router.post('/', configFieldsController.createConfigFields);
router.put('/:id', configFieldsController.updateConfigFields);
router.delete('/:id', configFieldsController.deleteConfigFields);

module.exports = router;
