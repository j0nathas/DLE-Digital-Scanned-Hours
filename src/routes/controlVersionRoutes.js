
const express = require('express');
const router = express.Router();
const controlVersionController = require('../controllers/controlVersionController');

router.get('/', controlVersionController.getAllControlVersion);
router.get('/:id', controlVersionController.getControlVersionById);
router.post('/', controlVersionController.createControlVersion);
router.put('/:id', controlVersionController.updateControlVersion);
router.delete('/:id', controlVersionController.deleteControlVersion);

module.exports = router;
