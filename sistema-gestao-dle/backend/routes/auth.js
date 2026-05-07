const express = require('express');
const { autenticado } = require('../middleware/authMiddleware');
const {
  login,
  solicitarReset,
  resetarSenha,
  verificar,
  logout,
} = require('../controllers/authController');

const router = express.Router();

router.post('/login',           login);
router.post('/solicitar-reset', solicitarReset);
router.post('/resetar-senha',   resetarSenha);
router.get('/verificar',        autenticado, verificar);
router.post('/logout',          autenticado, logout);

module.exports = router;