
const express = require('express');
const router = express.Router();
const aDFieldsController = require('../controllers/aDFieldsController');

router.get('/', aDFieldsController.getAllADFields);
router.get('/:id', aDFieldsController.getADFieldsById);
router.post('/', aDFieldsController.createADFields);
router.put('/:id', aDFieldsController.updateADFields);
router.delete('/:id', aDFieldsController.deleteADFields);

module.exports = router;
