
const express = require('express');
const router = express.Router();
const identificationModesController = require('../controllers/identificationModesController');

router.get('/', identificationModesController.getAllIdentificationModes);
router.get('/:id', identificationModesController.getIdentificationModesById);
router.post('/', identificationModesController.createIdentificationModes);
router.put('/:id', identificationModesController.updateIdentificationModes);
router.delete('/:id', identificationModesController.deleteIdentificationModes);

module.exports = router;
