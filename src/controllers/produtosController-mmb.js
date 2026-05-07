const { sql, poolPromiseMmb } = require('../config/db');


// --- OPERAÇÕES CRUD PADRÃO ---

// GET ALL - Obter todos os produtos
exports.getAllProdutos = async (req, res) => {
    try {
        const pool = await poolPromiseMmb;
        const result = await pool.request().query('SELECT * FROM dbo.Produtos ORDER BY descricao');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET BY ID - Obter um produto pelo seu ID
exports.getProdutoById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromiseMmb;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM dbo.Produtos WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST - Adicionar um novo produto
exports.createProduto = async (req, res) => {
    // Lista de todas as colunas da tabela Produtos (exceto 'id' que é autoincremento)
    const {
        cod_prod, descricao, prod_hora, n_operador, ppoh, cliente, id_planta,
        id_cc, id_setor, id_Linha_Maquina, id_op_1, id_op_2, id_op_3, id_op_4,
        id_op_5, id_op_6, id_op_7, id_op_8, id_op_9, id_op_10, Roteiro
    } = req.body;

    // Validação básica
    if (!cod_prod || !descricao) {
        return res.status(400).json({ message: 'cod_prod e descricao são obrigatórios.' });
    }

    try {
        const pool = await poolPromiseMmb;
        const request = pool.request();
        
        // Adicionando todos os inputs
        request.input('cod_prod', sql.NVarChar, cod_prod);
        request.input('descricao', sql.NVarChar, descricao);
        request.input('prod_hora', sql.Decimal(18, 2), prod_hora);
        request.input('n_operador', sql.Int, n_operador);
        request.input('ppoh', sql.Decimal(18, 4), ppoh);
        request.input('cliente', sql.NVarChar, cliente);
        request.input('id_planta', sql.Int, id_planta);
        request.input('id_cc', sql.Int, id_cc);
        request.input('id_setor', sql.Int, id_setor);
        request.input('id_Linha_Maquina', sql.Int, id_Linha_Maquina);
        request.input('id_op_1', sql.Int, id_op_1);
        request.input('id_op_2', sql.Int, id_op_2);
        request.input('id_op_3', sql.Int, id_op_3);
        request.input('id_op_4', sql.Int, id_op_4);
        request.input('id_op_5', sql.Int, id_op_5);
        request.input('id_op_6', sql.Int, id_op_6);
        request.input('id_op_7', sql.Int, id_op_7);
        request.input('id_op_8', sql.Int, id_op_8);
        request.input('id_op_9', sql.Int, id_op_9);
        request.input('id_op_10', sql.Int, id_op_10);
        request.input('Roteiro', sql.NVarChar, Roteiro);

        const query = `
            INSERT INTO dbo.Produtos (
                cod_prod, descricao, prod_hora, n_operador, ppoh, cliente, id_planta, 
                id_cc, id_setor, id_Linha_Maquina, id_op_1, id_op_2, id_op_3, id_op_4,
                id_op_5, id_op_6, id_op_7, id_op_8, id_op_9, id_op_10, Roteiro
            ) 
            OUTPUT INSERTED.* 
            VALUES (
                @cod_prod, @descricao, @prod_hora, @n_operador, @ppoh, @cliente, @id_planta, 
                @id_cc, @id_setor, @id_Linha_Maquina, @id_op_1, @id_op_2, @id_op_3, @id_op_4,
                @id_op_5, @id_op_6, @id_op_7, @id_op_8, @id_op_9, @id_op_10, @Roteiro
            )`;
        
        const result = await request.query(query);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- LÓGICA ESPECIAL DE AGRUPAMENTO ---

/**
 * Busca todos os produtos, agrupa as descrições (removendo LD/LE)
 * e popula a tabela Prod_Aux com os resultados únicos.
 * Esta é uma operação de processamento em lote.
 */
exports.groupAndPopulateProdAux = async (req, res) => {
    try {
        const pool = await poolPromiseMmb;

        // 1. Buscar todos os produtos da tabela principal
        console.log('Buscando todos os produtos...');
        const produtosResult = await pool.request().query('SELECT id, descricao FROM dbo.Produtos');
        const produtos = produtosResult.recordset;

        // 2. Processar e agrupar em memória usando um Map para garantir a unicidade
        console.log(`Processando ${produtos.length} produtos para agrupamento...`);
        const groupedMap = new Map();
        
        for (const produto of produtos) {
            if (produto.descricao) {
                // Remove " LD" ou " LE" do final da string, tratando espaços.
                // A regex \b(LD|LE)\b encontra "LD" ou "LE" como palavras inteiras.
                const cleanDesc = produto.descricao.replace(/\b(LD|LE)\b/g, '').replace(/\s\s+/g, ' ').trim();
                
                // Se a descrição limpa ainda não existe no mapa, adicione-a.
                // Usamos o ID do primeiro produto encontrado (seja LD ou LE) como referência.
                if (!groupedMap.has(cleanDesc)) {
                    groupedMap.set(cleanDesc, produto.id);
                }
            }
        }
        
        console.log(`Encontrados ${groupedMap.size} produtos únicos após o agrupamento.`);

        // 3. Limpar a tabela Prod_Aux antes de inserir novos dados
        console.log('Limpando a tabela Prod_Aux...');
        await pool.request().query('TRUNCATE TABLE dbo.Prod_Aux');

        // 4. Preparar para inserção em massa (Bulk Insert) para alta performance
        const table = new sql.Table('dbo.Prod_Aux');
        table.create = false; // A tabela já existe
        table.columns.add('id_prod', sql.Int, { nullable: false });
        table.columns.add('descricao', sql.NVarChar(sql.MAX), { nullable: true });

        // Adicionar as linhas à estrutura de tabela em memória
        for (const [descricao, id_prod] of groupedMap.entries()) {
            table.rows.add(id_prod, descricao);
        }

        // 5. Executar o Bulk Insert
        console.log('Inserindo dados agrupados na tabela Prod_Aux...');
        const bulkResult = await pool.request().bulk(table);
        
        res.status(200).json({
            message: 'Tabela Prod_Aux populada com sucesso!',
            totalOriginal: produtos.length,
            totalAgrupado: groupedMap.size,
            registrosInseridos: bulkResult.rowsAffected
        });

    } catch (err) {
        console.error('Erro ao agrupar e popular Prod_Aux:', err);
        res.status(500).json({ error: 'Falha no processo de agrupamento.', details: err.message });
    }
};

// GET ALL - Obter todos os produtos agrupados da tabela auxiliar
exports.getAllProdutosAgrupados = async (req, res) => {
    try {
        const pool = await poolPromiseMmb;
        const result = await pool.request().query('SELECT * FROM dbo.Prod_Aux ORDER BY descricao');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET ALL - Obter todos os grupos de produtos únicos da tabela Prod_Grupos
exports.getAllGruposDeProdutos = async (req, res) => {
    try {
        const pool = await poolPromiseMmb;
        // A consulta é na nova tabela 'Prod_Grupos'
        const result = await pool.request().query('SELECT * FROM dbo.Prod_Grupos ORDER BY descricao');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};