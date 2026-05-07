
const express = require('express');
const router = express.Router();
const schedulsController = require('../controllers/schedulsController');

router.get('/', schedulsController.getAllScheduls);
router.get('/:id', schedulsController.getSchedulsById);
router.post('/', schedulsController.createScheduls);
router.put('/:id', schedulsController.updateScheduls);
router.delete('/:id', schedulsController.deleteScheduls);

module.exports = router;
