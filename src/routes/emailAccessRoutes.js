
const express = require('express');
const router = express.Router();
const emailAccessController = require('../controllers/emailAccessController');

router.get('/', emailAccessController.getAllEmailAccess);
router.get('/:id', emailAccessController.getEmailAccessById);
router.post('/', emailAccessController.createEmailAccess);
router.put('/:id', emailAccessController.updateEmailAccess);
router.delete('/:id', emailAccessController.deleteEmailAccess);

module.exports = router;
