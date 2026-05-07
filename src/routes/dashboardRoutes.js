// ARQUIVO: src/routes/dashboardRoutes.js

// 1. IMPORTAÇÕES ESSENCIAIS
const express = require('express');
const router = express.Router();

// 2. IMPORTAÇÃO DO CONTROLLER
// Importa o controller que contém a lógica para as rotas deste arquivo.
const dashboardController = require('../controllers/dashboardController');

// 3. DEFINIÇÃO DA ROTA
// Esta rota agora funciona, pois a função 'getDashboardData' existe no controller.
router.get('/dados', dashboardController.getDashboardData);

// 4. EXPORTAÇÃO
// Disponibiliza as rotas para serem usadas no server.js.
module.exports = router;