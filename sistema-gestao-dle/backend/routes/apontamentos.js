const express = require('express');
const router = express.Router();
const apontamentoController = require('../controllers/apontamentoController');

// Rota para detalhes de uma máquina via query string
// A URL final será: /api/apontamentos/detalhes-maquina/:plantaSigla?machineId=...
router.get('/detalhes-maquina/:plantaSigla', apontamentoController.getOperadoresPorMaquina);

// Rota para lista de operadores ativos agora (gestão da planta)
// A URL final será: /api/apontamentos/operadores/:plantaSigla
router.get('/operadores/:plantaSigla', apontamentoController.getApontamentosAtivos);

// Rota para operadores ativos em uma máquina específica (modal de detalhes)
// A URL final será: /api/apontamentos/operadores/:plantaSigla/:machineId
router.get('/operadores/:plantaSigla/:machineId', apontamentoController.getOperadoresPorMaquina);

// Rota para apontamentos por período para o cálculo DLE
// A URL final será: /api/apontamentos/dle/:plantaSigla
router.get('/dle/:plantaSigla', apontamentoController.getApontamentosPorPeriodoDLE);

module.exports = router;