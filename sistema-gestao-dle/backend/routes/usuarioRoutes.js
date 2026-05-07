const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { autenticado } = require('../middleware/authMiddleware');

router.get('/perfis', autenticado, usuarioController.getPerfis);
router.post('/salvar', autenticado, usuarioController.autorizarUsuario);

module.exports = router;