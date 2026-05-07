
const express = require('express');
const router = express.Router();
const creditAreasController = require('../controllers/creditAreasController');

router.get('/', creditAreasController.getAllCreditAreas);
router.get('/:id', creditAreasController.getCreditAreasById);
router.post('/', creditAreasController.createCreditAreas);
router.put('/:id', creditAreasController.updateCreditAreas);
router.delete('/:id', creditAreasController.deleteCreditAreas);

module.exports = router;
