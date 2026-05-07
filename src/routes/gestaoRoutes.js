// ARQUIVO: src/routes/gestaoRoutes.js

const express = require('express');
const router = express.Router();
const gestaoController = require('../controllers/gestaoController');

function verificarAutenticacao(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: 'Acesso não autorizado.' });
}

const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

// --- ROTAS DE AUTENTICAÇÃO E INFORMAÇÃO ---
router.post('/login', gestaoController.login);
router.get('/logout', gestaoController.logout);
router.get('/user-info', verificarAutenticacao, gestaoController.getUserInfo);

// --- ROTAS DE DADOS PARA O DASHBOARD ---
router.get('/status-maquinas/:planta', verificarAutenticacao, noCache, gestaoController.getMachineStatus);
router.get('/dashboard-indicadores/:planta', verificarAutenticacao, noCache, gestaoController.getPlantDashboardData);

// --- ROTA ANTIGA (Pode ser removida se não for mais usada) ---
router.get('/dashboard-analytics', verificarAutenticacao, noCache, gestaoController.getDashboardAnalytics);
router.get('/debug/apontamentos', verificarAutenticacao, gestaoController.getRawApontamentos);
router.get('/indicadores/:planta', verificarAutenticacao, noCache, gestaoController.getIndicadoresData);

// --- ROTAS DE DADOS PARA O DASHBOARD ---
router.get('/status-maquinas/:planta', verificarAutenticacao, noCache, gestaoController.getMachineStatus);
// ROTA ANTIGA (será substituída)
// router.get('/dashboard-indicadores/:planta', verificarAutenticacao, noCache, gestaoController.getPlantDashboardData);

// NOVA ROTA PARA DADOS BRUTOS DO INDICADOR
router.get('/indicadores/raw-data/:planta', verificarAutenticacao, noCache, gestaoController.getIndicadoresRawData);

module.exports = router;