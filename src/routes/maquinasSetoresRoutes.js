const express = require('express');
const router = express.Router();
const maquinasSetoresController = require('../controllers/maquinasSetoresController');


router.get('/:planta', maquinasSetoresController.getMaquinasByPlanta);

module.exports = router;