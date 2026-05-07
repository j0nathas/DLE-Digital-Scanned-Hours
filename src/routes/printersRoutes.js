
const express = require('express');
const router = express.Router();
const printersController = require('../controllers/printersController');

router.get('/', printersController.getAllPrinters);
router.get('/:id', printersController.getPrintersById);
router.post('/', printersController.createPrinters);
router.put('/:id', printersController.updatePrinters);
router.delete('/:id', printersController.deletePrinters);

module.exports = router;
