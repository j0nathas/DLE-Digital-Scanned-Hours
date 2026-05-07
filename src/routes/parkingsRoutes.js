
const express = require('express');
const router = express.Router();
const parkingsController = require('../controllers/parkingsController');

router.get('/', parkingsController.getAllParkings);
router.get('/:id', parkingsController.getParkingsById);
router.post('/', parkingsController.createParkings);
router.put('/:id', parkingsController.updateParkings);
router.delete('/:id', parkingsController.deleteParkings);

module.exports = router;
