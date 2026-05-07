
const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groupsController');

router.get('/', groupsController.getAllGroups);
router.get('/:id', groupsController.getGroupsById);
router.post('/', groupsController.createGroups);
router.put('/:id', groupsController.updateGroups);
router.delete('/:id', groupsController.deleteGroups);

module.exports = router;
