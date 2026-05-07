const express = require('express');
const router = express.Router();

// =======================================================
// ==               AÇÃO CORRETIVA AQUI                 ==
// =======================================================
// Importa AMBOS os controllers que serão usados neste arquivo de rotas.
const plantaController = require('../controllers/plantaController');
const apontamentoController = require('../controllers/apontamentoController');


// Rota para listar todas as plantas (usa o plantaController)
router.get('/listar', plantaController.getAllPlantas);


// =======================================================
// ==    ROTAS DE APONTAMENTO RELACIONADAS A PLANTA     ==
// =======================================================
// Todas as rotas abaixo estão logicamente relacionadas a "planta" e usam o apontamentoController.

// Rota para buscar os contadores de operadores ativos de uma planta
router.get('/operadores/:plantaSigla', apontamentoController.getApontamentosAtivos);

// Rota para buscar os NOMES dos operadores de uma máquina específica para o tooltip
router.get('/operadores/:plantaSigla/:machineId', apontamentoController.getOperadoresPorMaquina);


// (Se houver uma rota para buscar o layout, ela também deve estar aqui)
// router.get('/maquinas/:plantaSigla', apontamentoController.getMaquinasLayout);


module.exports = router;