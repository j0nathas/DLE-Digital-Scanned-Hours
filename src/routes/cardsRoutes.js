
const express = require('express');
const router = express.Router();
const cardsController = require('../controllers/cardsController');

router.get('/', cardsController.getAllCards);
router.get('/:id', cardsController.getCardsById);
router.post('/', cardsController.createCards);
router.put('/:id', cardsController.updateCards);
router.delete('/:id', cardsController.deleteCards);

module.exports = router;
