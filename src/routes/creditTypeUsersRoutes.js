
const express = require('express');
const router = express.Router();
const creditTypeUsersController = require('../controllers/creditTypeUsersController');

router.get('/', creditTypeUsersController.getAllCreditTypeUsers);
router.get('/:id', creditTypeUsersController.getCreditTypeUsersById);
router.post('/', creditTypeUsersController.createCreditTypeUsers);
router.put('/:id', creditTypeUsersController.updateCreditTypeUsers);
router.delete('/:id', creditTypeUsersController.deleteCreditTypeUsers);

module.exports = router;
