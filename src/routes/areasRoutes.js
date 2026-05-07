
const express = require('express');
const router = express.Router();
const areasController = require('../controllers/areasController');

router.get('/', areasController.getAllAreas);
router.get('/:id', areasController.getAreasById);
router.post('/', areasController.createAreas);
router.put('/:id', areasController.updateAreas);
router.delete('/:id', areasController.deleteAreas);

module.exports = router;
