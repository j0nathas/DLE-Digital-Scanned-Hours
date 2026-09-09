// Caminho: src/routes/apontamentoRoutes.js
const express = require('express');
const router = express.Router();
const apontamentoController = require('../controllers/apontamentoController');
const logAcessosController = require('../controllers/logAcessosController');

// --- ROTAS PARA APONTAMENTO TL ---
router.post('/tl', apontamentoController.createApontamentoTL);
router.get('/validar-tl', logAcessosController.getUltimoAcessoTL);
router.get('/getesperados', apontamentoController.getEsperado);
router.get('/getOperadoresApontados', apontamentoController.getOperadoresApontados);
router.get('/operadoresSemSaida', apontamentoController.registrarSaidasPendentes);
router.get('/verificarEntradaRecente', apontamentoController.verificarEntradaRecente);
router.get('/getProdutosPorLinha', apontamentoController.getProdutosPorLinha);
router.get('/getProdutos', apontamentoController.getProdutos);

router.get('/ultimoapontamento-ip/:ip', apontamentoController.getUltimoApontamentoPorIp);
router.get('/status/:linha', apontamentoController.getLinhaStatus);


// --- ROTAS PARA APONTAMENTO OPERADOR ---
router.post('/operador', apontamentoController.createApontamentoOperador);
router.post('/registrar-ponto-operador', apontamentoController.registrarPontoOperador);
router.get('/operador/hoje', apontamentoController.getApontamentosOperadorDia); // Rota para buscar contagem
// No seu apontamentoRoutes.js
router.get('/listaOperadores', apontamentoController.getPessoasComUltimoStatusEntrada);
router.get('/operadores/:planta/:machineId', apontamentoController.getOperadoresPorMaquina);
// --- ROTA DE SIMULAÇÃO ---
router.post('/simular-acesso', logAcessosController.simularAcesso);


router.get('/getProdutosPorLinha_JARINU', apontamentoController.getProdutosPorLinha_JARINU);
router.get('/getProdutos_JARINU', apontamentoController.getProdutos_JARINU);
router.post('/operador_JARINU', apontamentoController.createApontamentoOperador_JARINU);
router.post('/tl_JARINU', apontamentoController.createApontamentoTL_JARINU);
router.get('/ultimoapontamento-ip_JARINU/:ip', apontamentoController.getUltimoApontamentoPorIp_JARINU);


module.exports = router;