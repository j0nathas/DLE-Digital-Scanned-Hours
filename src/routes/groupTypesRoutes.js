
const express = require('express');
const router = express.Router();
const groupTypesController = require('../controllers/groupTypesController');

router.get('/', groupTypesController.getAllGroupTypes);
router.get('/:id', groupTypesController.getGroupTypesById);
router.post('/', groupTypesController.createGroupTypes);
router.put('/:id', groupTypesController.updateGroupTypes);
router.delete('/:id', groupTypesController.deleteGroupTypes);

module.exports = router;
