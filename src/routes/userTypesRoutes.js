
const express = require('express');
const router = express.Router();
const userTypesController = require('../controllers/userTypesController');

router.get('/', userTypesController.getAllUserTypes);
router.get('/:id', userTypesController.getUserTypesById);
router.post('/', userTypesController.createUserTypes);
router.put('/:id', userTypesController.updateUserTypes);
router.delete('/:id', userTypesController.deleteUserTypes);

module.exports = router;
