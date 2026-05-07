const express = require('express');
const router = express.Router();
const indicadorController = require('../controllers/indicadorController');
const apontamentoController = require('../controllers/apontamentoController');

// Rota para buscar o layout das máquinas de uma planta
// A URL final será: /api/indicadores/maquinas/:plantaSigla
router.get('/maquinas/:plantaSigla', apontamentoController.getMaquinasLayout);

// Rota para buscar os dados dos operadores para o dashboard de gestão
// A URL final será: /api/indicadores/operadores/:plantaSigla
router.get('/operadores/:plantaSigla', apontamentoController.getApontamentosAtivos);

// Rota para os gráficos de indicadores da fábrica
// A URL final será: /api/indicadores/fabrica
router.get('/fabrica', indicadorController.getIndicadoresFabrica);

// ROTA CORRIGIDA: Detalhamento de Logs para conferência de 8h (Hierarquia)
// A URL final será: /api/indicadores/operadores-detalhado
router.get('/operadores-detalhado', apontamentoController.getOperadoresDetalhado);

module.exports = router;