// Caminho: src/routes/logAcessosRoutes.js

const express = require('express');
const router = express.Router();
const logAcessosController = require('../controllers/logAcessosController');

// Rota para o fluxo do Team Leader
router.get('/ultimo-acesso-tl', logAcessosController.getUltimoAcessoTL);

// Rota para simular a passada do crachá
router.post('/simular-acesso', logAcessosController.simularAcesso);

module.exports = router;