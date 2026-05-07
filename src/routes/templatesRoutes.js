
const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templatesController');

router.get('/', templatesController.getAllTemplates);
router.get('/:id', templatesController.getTemplatesById);
router.post('/', templatesController.createTemplates);
router.put('/:id', templatesController.updateTemplates);
router.delete('/:id', templatesController.deleteTemplates);

module.exports = router;
