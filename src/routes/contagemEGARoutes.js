const express = require('express');
const router = express.Router();
const contagemEGAController = require('../controllers/contagemEGAController');

router.get('/contagemEGA/:maquina', contagemEGAController.buscarContagemEGA);
router.get('/esperadoEGA/:maquina', contagemEGAController.buscarEsperadoEGA);

module.exports = router;