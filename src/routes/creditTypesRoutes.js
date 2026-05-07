
const express = require('express');
const router = express.Router();
const creditTypesController = require('../controllers/creditTypesController');

router.get('/', creditTypesController.getAllCreditTypes);
router.get('/:id', creditTypesController.getCreditTypesById);
router.post('/', creditTypesController.createCreditTypes);
router.put('/:id', creditTypesController.updateCreditTypes);
router.delete('/:id', creditTypesController.deleteCreditTypes);

module.exports = router;
