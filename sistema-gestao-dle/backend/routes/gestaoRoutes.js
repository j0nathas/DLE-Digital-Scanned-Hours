const express = require('express');
const router = express.Router();
const gestaoController = require('../controllers/gestaoController');

// --- Rota de Layout ---
router.get('/layout/:plantaSigla', gestaoController.getMaquinasLayout);

// --- Rotas de Dados do Dashboard ---
router.get('/contagem/:plantaSigla', gestaoController.getContagemCards);
router.get('/contagem-ega', gestaoController.getContagemEGA);
router.get('/cadastro-operadores', gestaoController.getCadastroOperadores);

// --- Rota de Detalhes (Modal) ---
router.get('/detalhes/:plantaSigla/:machineId', gestaoController.getOperadoresPorMaquina);

// --- Rotas vindas do antigo ApontamentoController (Agora unificadas) ---
router.get('/operador/hoje', gestaoController.getApontamentosOperadorDia); 
router.get('/listaOperadores', gestaoController.getPessoasComUltimoStatusEntrada);

// Se houver uma rota duplicada de operadores, use a de detalhes acima ou esta:
router.get('/operadores/:plantaSigla/:machineId', gestaoController.getOperadoresPorMaquina);

module.exports = router;