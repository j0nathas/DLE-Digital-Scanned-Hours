
const express = require('express');
const router = express.Router();
const deviceRelaysController = require('../controllers/deviceRelaysController');

router.get('/', deviceRelaysController.getAllDeviceRelays);
router.get('/:id', deviceRelaysController.getDeviceRelaysById);
router.post('/', deviceRelaysController.createDeviceRelays);
router.put('/:id', deviceRelaysController.updateDeviceRelays);
router.delete('/:id', deviceRelaysController.deleteDeviceRelays);

module.exports = router;
