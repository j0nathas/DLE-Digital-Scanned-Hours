
const express = require('express');
const router = express.Router();
const userCreditsController = require('../controllers/userCreditsController');

router.get('/', userCreditsController.getAllUserCredits);
router.get('/:id', userCreditsController.getUserCreditsById);
router.post('/', userCreditsController.createUserCredits);
router.put('/:id', userCreditsController.updateUserCredits);
router.delete('/:id', userCreditsController.deleteUserCredits);

module.exports = router;
