
const express = require('express');
const router = express.Router();
const importUsersController = require('../controllers/importUsersController');

router.get('/', importUsersController.getAllImportUsers);
router.get('/:id', importUsersController.getImportUsersById);
router.post('/', importUsersController.createImportUsers);
router.put('/:id', importUsersController.updateImportUsers);
router.delete('/:id', importUsersController.deleteImportUsers);

module.exports = router;
