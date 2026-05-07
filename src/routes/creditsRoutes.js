
const express = require('express');
const router = express.Router();
const creditsController = require('../controllers/creditsController');

router.get('/', creditsController.getAllCredits);
router.get('/:id', creditsController.getCreditsById);
router.post('/', creditsController.createCredits);
router.put('/:id', creditsController.updateCredits);
router.delete('/:id', creditsController.deleteCredits);

module.exports = router;
