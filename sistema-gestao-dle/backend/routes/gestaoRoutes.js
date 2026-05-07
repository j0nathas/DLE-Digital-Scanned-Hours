const express = require('express');
const router = express.Router();
const gestaoController = require('../controllers/gestaoController');

// Rota de contagem dos cards (Atual / Meta)
router.get('/contagem/:plantaSigla', gestaoController.getContagemCards);

// Rota de detalhes do modal (lista de operadores)
router.get('/detalhes/:plantaSigla/:machineId', gestaoController.getOperadoresNaMaquina);

module.exports = router;