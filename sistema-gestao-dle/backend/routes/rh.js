const express = require('express');
const router = express.Router();
const rhController = require('../controllers/rhController');

/**
 * @route   GET /api/rh/indicadores
 * @desc    Retorna horas pagas agregadas por Setor/Centro de Custo
 */
router.get('/indicadores', rhController.getIndicadoresRH);

/**
 * @route   GET /api/rh/operadores
 * @desc    Retorna horas pagas detalhadas por RE/Operador (Individual)
 */
router.get('/operadores', rhController.getIndicadoresOperadoresRH);

/**
 * @route   GET /api/rh/datas
 * @desc    Retorna a data mínima e máxima presente na view de RH
 */
router.get('/datas', rhController.getLimitesDatas);

module.exports = router;