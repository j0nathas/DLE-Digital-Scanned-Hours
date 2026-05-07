const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');

router.post('/agrupar', produtosController.groupAndPopulateProdAux);
router.get('/agrupados/todos', produtosController.getAllProdutosAgrupados);
router.get('/grupos/todos', produtosController.getAllGruposDeProdutos); 
router.get('/', produtosController.getAllProdutos);
router.get('/:id', produtosController.getProdutoById);
router.post('/', produtosController.createProduto);

module.exports = router;