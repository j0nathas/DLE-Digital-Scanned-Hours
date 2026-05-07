
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

router.get('/', usersController.getAllUsers);
router.get('/:id', usersController.getUsersById);
router.post('/', usersController.createUsers);
router.put('/:id', usersController.updateUsers);
router.delete('/:id', usersController.deleteUsers);

module.exports = router;
