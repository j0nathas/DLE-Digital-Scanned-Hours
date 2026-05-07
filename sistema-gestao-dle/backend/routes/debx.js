const express = require('express');
const router = express.Router();
const debxController = require('../controllers/debxController');

router.get('/merge/all',        debxController.getMergeAll);
router.get('/refugo',           debxController.getRefugo);
router.get('/colunas-kardex',   debxController.getColunasFKardex);
router.get('/tabela-turnos',    debxController.getTabelaTurnos);

module.exports = router;