
const express = require('express');
const router = express.Router();
const userGroupsController = require('../controllers/userGroupsController');

router.get('/', userGroupsController.getAllUserGroups);
router.get('/:id', userGroupsController.getUserGroupsById);
router.post('/', userGroupsController.createUserGroups);
router.put('/:id', userGroupsController.updateUserGroups);
router.delete('/:id', userGroupsController.deleteUserGroups);

module.exports = router;
