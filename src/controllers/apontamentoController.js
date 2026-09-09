const { sql, poolPromiseAcessos, poolPromiseControlId } = require('../config/db');
const maquinasSemProduto = ['s.MT01', 's.MT02', 's.MT03', 's.MT04', 's.I21h1k530', 's.I22h1k1300', 's.I23h3k1000', 's.I24h1k1300', 's.I25h3k1000',
    's.I26h1k530', 's.I27h2k1000', 's.I29h1k1300', 's.I30h2k1700', 's.I31h2k1000', 's.I32h1k1000', 's.I33h2k1000', 's.I34h1k1300'
];

const SERVIDORES_POR_PLANTA = {
    "JARINU": "[SERVIDOR_RH_JARINU].[mjn_dle].[dbo].[Users]",
    "CAMPINAS": "[SERVIDOR_RH_CAMPINAS].[mjn_dle].[dbo].[Users]",
    // adicione outras plantas aqui
};

const validarLinhaEProduto = async (linha, prod_LE, prod_LD, prod_Unico) => {
    try {
        const pool = await poolPromiseAcessos;
        let queryValida = false;

        if (linha.includes('_')) {
            const request = pool.request();
            let subQueryParts = [];

            const [linhaLado1, linhaLado2] = linha.split('_');

            if (prod_LE) {
                request.input('ProdLE', sql.VarChar, prod_LE);
                subQueryParts.push(`(lm.descricao = @LinhaLado1 AND p.descricao = @ProdLE)`);
            }
            if (prod_LD) {
                request.input('ProdLD', sql.VarChar, prod_LD);
                subQueryParts.push(`(lm.descricao = @LinhaLado2 AND p.descricao = @ProdLD)`);
            }
            if (prod_Unico) {
                request.input('ProdUnico', sql.VarChar, prod_Unico);
                subQueryParts.push(`((lm.descricao = @LinhaLado1 OR lm.descricao = @LinhaLado2) AND p.descricao = @ProdUnico)`);
            }

            if (subQueryParts.length === 0) {
                return false;
            }

            request.input('LinhaLado1', sql.VarChar, linhaLado1);
            request.input('LinhaLado2', sql.VarChar, linhaLado2);

            const query = `
                SELECT
                    (SELECT COUNT(*) FROM cadastros_mlb.dbo.Produtos AS p_le
                     INNER JOIN cadastros_mlb.dbo.Linha_Maquinas AS lm_le ON p_le.id_Linha_Maquina = lm_le.id
                     WHERE ${prod_LE ? `lm_le.descricao = @LinhaLado1 AND p_le.descricao = @ProdLE` : `1=1`}) AS CountLE,
                    (SELECT COUNT(*) FROM cadastros_mlb.dbo.Produtos AS p_ld
                     INNER JOIN cadastros_mlb.dbo.Linha_Maquinas AS lm_ld ON p_ld.id_Linha_Maquina = lm_ld.id
                     WHERE ${prod_LD ? `lm_ld.descricao = @LinhaLado2 AND p_ld.descricao = @ProdLD` : `1=1`}) AS CountLD,
                    (SELECT COUNT(*) FROM cadastros_mlb.dbo.Produtos AS p_unico
                     INNER JOIN cadastros_mlb.dbo.Linha_Maquinas AS lm_unico ON p_unico.id_Linha_Maquina = lm_unico.id
                     WHERE ${prod_Unico ? `(lm_unico.descricao = @LinhaLado1 OR lm_unico.descricao = @LinhaLado2) AND p_unico.descricao = @ProdUnico` : `1=1`}) AS CountUnico
            `;


            const result = await request.query(query);

            if (!result.recordset || result.recordset.length === 0) return false;
            const { CountLE, CountLD, CountUnico } = result.recordset[0];

            queryValida = (prod_LE ? CountLE > 0 : true) &&
                (prod_LD ? CountLD > 0 : true) &&
                (prod_Unico ? CountUnico > 0 : true);

        } else {
            const result = await pool.request()
                .input('Linha', sql.VarChar, linha)
                .input('ProdLE', sql.VarChar, prod_LE || null)
                .input('ProdLD', sql.VarChar, prod_LD || null)
                .input('ProdUnico', sql.VarChar, prod_Unico || null)
                .query(`
                    SELECT COUNT(*) AS count
                    FROM cadastros_mlb.dbo.Produtos AS p
                    INNER JOIN cadastros_mlb.dbo.Linha_Maquinas AS lm ON p.id_Linha_Maquina = lm.id
                    WHERE lm.descricao = @Linha
                      AND (
                            (@ProdLE IS NOT NULL AND p.descricao = @ProdLE) OR
                            (@ProdLD IS NOT NULL AND p.descricao = @ProdLD) OR
                            (@ProdUnico IS NOT NULL AND p.descricao = @ProdUnico)
                          )
                `);
            if (result.recordset && result.recordset.length > 0) {
                queryValida = result.recordset[0].count > 0;
            }
        }

        return queryValida;

    } catch (err) {
        console.error('Erro ao validar linha e produto:', err);
        throw new Error('Falha ao validar linha e produto');
    }
};

const apontamentoController = {

    getLinhaStatus: async (req, res) => {
        const { linha } = req.params; // Pega a 'linha' dos parâmetros da URL

        if (!linha) {
            return res.status(400).json({ error: 'O nome da linha é obrigatório.' });
        }

        try {
            const pool = await poolPromiseAcessos;
            const resultUltimo = await pool.request()
                .input('Linha', sql.VarChar(50), linha)
                .query(`
                SELECT TOP 1 status_turno
                FROM dbo.Apontamento_TL
                WHERE Linha = @Linha
                ORDER BY Data DESC, id DESC
            `);

            const ultimoStatus = resultUltimo.recordset[0]?.status_turno || 'Não Encontrado'; // Retorna 'Não Encontrado' se não houver registros

            res.status(200).json({ linha, ultimoStatus });

        } catch (err) {
            console.error(`Erro ao buscar o status da linha "${linha}":`, err);
            res.status(500).json({ error: 'Erro interno do servidor ao buscar status da linha.' });
        }
    },

    createApontamentoTL: async (req, res) => {
        console.log('BACKEND RECEBEU:', req.body);
        const { turno, RE, pessoa, cargo, linha, qntd_esperada, status_turno, prod_LE, prod_LD, prod_Unico } = req.body;

        if (!turno || !RE || !pessoa || !cargo || !linha || qntd_esperada == null || !status_turno) {
            console.log('VALIDAÇÃO FALHOU: Campos obrigatórios ausentes.');
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        try {
            const pool = await poolPromiseAcessos;

            /* const isLinhaSemProduto = maquinasSemProduto.includes(linha);
    
            if (!isLinhaSemProduto) { 
                const valido = await validarLinhaEProduto(linha, prod_LE, prod_LD, prod_Unico);
                if (!valido) {
                    return res.status(400).json({ error: `O produto(s) fornecido(s) não está(ão) corretamente associado(s) à linha "${linha}".` });
                }
            } else {
                console.log(`Linha "${linha}" está na lista de máquinas sem produto, pulando validação de produto.`);
            } */


            if (status_turno === 'Produzindo') {
                const resultUltimo = await pool.request()
                    .input('Linha', sql.VarChar(50), linha)
                    .query(`
                    SELECT TOP 1 status_turno
                    FROM dbo.Apontamento_TL
                    WHERE Linha = @Linha
                    ORDER BY Data DESC, id DESC
                `);

                const ultimoStatus = resultUltimo.recordset[0]?.status_turno;

                if (ultimoStatus === 'Produzindo') {
                    return res.status(400).json({
                        error: `A linha "${linha}" já está em produção. Finalize o último apontamento antes de criar um novo.`
                    });
                }
            }

            const request = pool.request();
            request.input('Turno', sql.VarChar(20), turno);
            request.input('Pessoa', sql.VarChar(100), pessoa);
            request.input('RE', sql.VarChar(255), RE);
            request.input('Cargo', sql.VarChar(50), cargo);
            request.input('Linha', sql.VarChar(50), linha);
            request.input('Qntd_Esperada', sql.Int, qntd_esperada);
            request.input('status_turno', sql.VarChar(50), status_turno);
            request.input('prod_LE', sql.VarChar(100), prod_LE);
            request.input('prod_LD', sql.VarChar(100), prod_LD);
            request.input('prod_Unico', sql.VarChar(100), prod_Unico);

            const query = `
            INSERT INTO dbo.Apontamento_TL
            (Data, Turno, RE, Pessoa, Cargo, Linha, Qntd_Esperada, status_turno, Hora, prod_LE, prod_LD, prod_Unico, Planta)
            VALUES (GETDATE(), @Turno, @RE, @Pessoa, @Cargo, @Linha, @Qntd_Esperada, @status_turno, CAST(GETDATE() AS TIME), @prod_LE, @prod_LD, @prod_Unico, 'MLB')
        `;

            await request.query(query);
            res.status(201).json({ message: 'Apontamento de TL criado com sucesso!' });

        } catch (err) {
            console.error('Erro ao inserir apontamento de TL:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    createApontamentoOperador: async (req, res) => {
        console.log('BACKEND RECEBEU:', req.body);

        const { turno, RE, pessoa, cargo, linha, qntd_esperada, operacao, status, prod_LE, prod_LD, prod_Unico } = req.body;
        const pool = await poolPromiseAcessos;
        // 1. Abrir transação
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            request.input('Pessoa', sql.VarChar(200), pessoa);
            request.input('RE', sql.VarChar(255), RE);
            request.input('Status', sql.VarChar(50), status);
            request.input('Linha', sql.VarChar(50), linha);
            request.input('Turno', sql.VarChar(20), turno);
            request.input('Cargo', sql.VarChar(50), cargo);
            request.input('Qntd_Esperada', sql.Int, qntd_esperada);
            request.input('Operacao', sql.VarChar(50), operacao);
            request.input('prod_LE', sql.VarChar(100), prod_LE);
            request.input('prod_LD', sql.VarChar(100), prod_LD);
            request.input('prod_Unico', sql.VarChar(100), prod_Unico);

            // 2. Bloquear a linha usada
            await request.query(`
        SELECT *
        FROM dbo.Apontamento_Operador WITH (UPDLOCK, HOLDLOCK)
        WHERE Linha = @Linha;
    `);

            // 3. Verificação de duplicidade ainda funciona normalmente
            const checkDup = await request.query(`
        SELECT TOP 1 *
        FROM dbo.Apontamento_Operador
        WHERE Pessoa = @Pessoa
        AND RE = @RE
        AND Status = @Status
        AND Data >= DATEADD(SECOND, -5, GETDATE())
        ORDER BY Data DESC
    `);

            if (checkDup.recordset.length > 0) {
                await transaction.rollback();
                return res.status(409).json({
                    sucesso: false,
                    mensagem: `Operação duplicada: já existe uma ${status} registrada recentemente.`,
                    tipo: "DUPLICADO"
                });
            }

            // 4. Realiza o insert
            await request.query(`
        INSERT INTO dbo.Apontamento_Operador 
        (Data, Turno, RE, Pessoa, Cargo, Linha, Qntd_Esperada, Qntd_Real, Operacao, Hora, Status, prod_LE, prod_LD, prod_Unico, Planta)
        VALUES (
            GETDATE(), @Turno, @RE, @Pessoa, @Cargo, @Linha, @Qntd_Esperada, 0,
            @Operacao, CAST(GETDATE() AS TIME), @Status, @prod_LE, @prod_LD, @prod_Unico, 'MLB'
        )
    `);

            // 5. Finaliza
            await transaction.commit();

            res.status(201).json({
                sucesso: true,
                mensagem: 'Apontamento registrado com sucesso.'
            });

        } catch (err) {
            await transaction.rollback();
            console.error('Erro ao inserir apontamento:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }

    },


    registrarPontoOperador: async (req, res) => {
        const { pessoa, RE } = req.body;

        if (!pessoa) {
            return res.status(400).json({ error: 'Nome da pessoa é obrigatório.' });
        }

        try {
            const pool = await poolPromiseAcessos;

            const ultimoApontamentoResult = await pool.request()
                .input('pessoa', sql.VarChar, pessoa)
                .query(`
                    SELECT TOP 1 * 
                    FROM dbo.Apontamento_Operador 
                    WHERE 
                        Pessoa = @pessoa 
                        AND RE = @RE
                        AND CAST(Data AS DATE) = CAST(GETDATE() AS DATE)
                    ORDER BY ID DESC
                `);

            const ultimoApontamento = ultimoApontamentoResult.recordset[0];

            if (ultimoApontamento && ultimoApontamento.Status === 'Entrada') {
                const saidaRequest = pool.request();
                saidaRequest.input('Turno', sql.VarChar, ultimoApontamento.Turno);
                saidaRequest.input('RE', sql.VarChar, ultimoApontamento.RE);
                saidaRequest.input('Pessoa', sql.VarChar, ultimoApontamento.Pessoa);
                saidaRequest.input('Cargo', sql.VarChar, ultimoApontamento.Cargo);
                saidaRequest.input('Linha', sql.VarChar, ultimoApontamento.Linha);
                saidaRequest.input('Qntd_Esperada', sql.Int, ultimoApontamento.Qntd_Esperada);
                saidaRequest.input('Qntd_Real', sql.Int, 0);
                saidaRequest.input('Operacao', sql.VarChar, ultimoApontamento.Operacao);
                saidaRequest.input('Status', sql.VarChar, 'Saida');
                saidaRequest.input('prod_LE', sql.VarChar, ultimoApontamento.prod_LE);
                saidaRequest.input('prod_LD', sql.VarChar, ultimoApontamento.prod_LD);
                saidaRequest.input('prod_Unico', sql.VarChar, ultimoApontamento.prod_Unico);
                saidaRequest.input('Planta', sql.VarChar, ultimoApontamento.Planta);

                const querySaida = `
                    INSERT INTO dbo.Apontamento_Operador 
                        (Data, Turno, RE, Pessoa, Cargo, Linha, Qntd_Esperada, Qntd_Real, Operacao, Hora, Status, prod_LE, prod_LD, prod_Unico)
                    VALUES 
                        (CAST(GETDATE() AS DATE), @Turno, @RE, @Pessoa, @Cargo, @Linha, @Qntd_Esperada, @Qntd_Real, @Operacao, CAST(GETDATE() AS TIME), @Status, @prod_LE, @prod_LD, @prod_Unico)`;

                await saidaRequest.query(querySaida);

                return res.status(200).json({
                    success: true,
                    action: 'Saida',
                    message: `Saída de ${pessoa} da operação ${ultimoApontamento.Operacao} registrada.`,
                    operador: pessoa
                });

            } else {
                return res.status(200).json({
                    success: true,
                    action: 'EntradaNecessaria',
                    message: 'Operador não possui sessão ativa. Abrindo modal para nova entrada.',
                    operador: pessoa
                });
            }

        } catch (error) {
            console.error('Erro ao registrar ponto do operador:', error);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    getProdutosPorLinha: async (req, res) => {
        try {
            const pool = await poolPromiseAcessos;

            const result = await pool.request().query(`
            SELECT 
                lm.descricao AS LinhaNome,
                p.descricao AS ProdutoDescricao,
                p.cod_prod AS ProdutoCodigo
            FROM cadastros_mlb.dbo.Produtos AS p
            INNER JOIN cadastros_mlb.dbo.Linha_Maquinas AS lm
                ON p.id_Linha_Maquina = lm.id
            ORDER BY lm.descricao, p.descricao;
        `);

            const registros = result.recordset;

            if (registros.length === 0) {
                return res.status(404).json({ message: 'Nenhum produto encontrado com linhas associadas.' });
            }

            const agrupadoPorLinha = {};

            registros.forEach(row => {
                const { LinhaNome, ProdutoDescricao, ProdutoCodigo } = row;

                if (!agrupadoPorLinha[LinhaNome]) {
                    agrupadoPorLinha[LinhaNome] = {
                        linha: LinhaNome,
                        produtos: []
                    };
                }

                agrupadoPorLinha[LinhaNome].produtos.push({
                    codigo: ProdutoCodigo,
                    descricao: ProdutoDescricao
                });
            });

            const resultadoFinal = Object.values(agrupadoPorLinha);

            res.status(200).json(resultadoFinal);

        } catch (err) {
            console.error('Erro ao buscar produtos por linha:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    getProdutos: async (req, res) => {
        try {
            const pool = await poolPromiseAcessos;
            const result = await pool.request().query(`
            SELECT DISTINCT
                pa.ID_PROD,
                pa.DESCRICAO,
                pa.COD_LE,
                pa.COD_LD,
                pa.COD_AMBOS,
                m.MAQUINA
            FROM
                [cadastros_mlb].[dbo].[Prod_Aux] pa
            CROSS APPLY (
                SELECT c.MAQUINA AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                UNION ALL
                SELECT c.Maquina_alternativa AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                  AND c.Maquina_alternativa IS NOT NULL
                UNION ALL
                SELECT c.Maquina_alternativa22 AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                  AND c.Maquina_alternativa22 IS NOT NULL
                UNION ALL
                SELECT c.Maquina_alternativa32 AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                  AND c.Maquina_alternativa32 IS NOT NULL
                UNION ALL
                SELECT c.Maquina_alternativa42 AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                  AND c.Maquina_alternativa42 IS NOT NULL
                UNION ALL
                SELECT c.Maquina_alternativa52 AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                  AND c.Maquina_alternativa52 IS NOT NULL
                UNION ALL
                SELECT c.Maquina_alternativa62 AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                  AND c.Maquina_alternativa62 IS NOT NULL
                UNION ALL
                SELECT c.Maquina_alternativa72 AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                  AND c.Maquina_alternativa72 IS NOT NULL
                UNION ALL
                SELECT c.Maquina_alternativa9 AS MAQUINA
                FROM [cadastros_mlb].[dbo].[Carga] c
                WHERE COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
                  AND c.Maquina_alternativa9 IS NOT NULL
            ) AS m
            ORDER BY
                pa.ID_PROD, m.MAQUINA;
        `);

            const registros = result.recordset;
            if (!registros.length) {
                return res.status(404).json({ message: 'Nenhum produto encontrado com linhas associadas.' });
            }

            const agrupadoPorMaquina = registros.reduce((acc, currentRecord) => {
                const { MAQUINA, DESCRICAO, COD_LE, COD_LD, COD_AMBOS } = currentRecord;

                const chave = MAQUINA || 'Sem Máquina';
                if (!acc[chave]) {
                    acc[chave] = {
                        maquina: chave,
                        produtos: []
                    };
                }

                const produtoExiste = acc[chave].produtos.some(p => p.produto === DESCRICAO && p.cod_le === COD_LE && p.cod_ld === COD_LD && p.cod_unico === COD_AMBOS);

                if (!produtoExiste) {
                    acc[chave].produtos.push({
                        produto: DESCRICAO,
                        cod_le: COD_LE,
                        cod_ld: COD_LD,
                        cod_unico: COD_AMBOS
                    });
                }
                return acc;
            }, {});

            res.status(200).json(Object.values(agrupadoPorMaquina));

        } catch (err) {
            console.error('[API ERRO] getProdutos:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },


    getUltimoApontamentoPorIp: async (req, res) => {
        try {
            const { ip } = req.params;
            const pool = await poolPromiseAcessos;

            const query = `
            WITH RankedLogs AS (
                SELECT TOP 1 
                    ID_Log_Original AS id,
                    Nome_Colaborador AS nome,
                    Matricula as RE,
                    Cargo AS cargo,
                    IP_Dispositivo AS ipDispositivo
                FROM
                    dbo.vw_log_acessos_mlb
                WHERE
                     IP_Dispositivo = @ip 
                ORDER BY ID_Log_Original DESC
            )
            SELECT
                id,
                nome,
                RE,
                cargo,
                ipDispositivo
            FROM
                RankedLogs;
        `;

            const result = await pool.request()
                .input('ip', sql.NVarChar, ip)
                .query(query);

            if (result.recordset.length === 0) {
                return res.status(404).json({ message: `Nenhum registro qualificado encontrado para o IP ${ip}.` });
            }

            res.status(200).json(result.recordset[0]);

        } catch (err) {
            console.error(`Erro ao buscar último registro para o IP ${req.params.ip}:`, err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    getPessoasComUltimoStatusEntrada: async (req, res) => {
        try {
            const pool = await poolPromiseAcessos;
            const query = `
            WITH UltimosStatus AS (
                SELECT
                    ao1.pessoa,
                    ao1.Linha,
                    ao1.Operacao,
                    ao1.Status,
                    ROW_NUMBER() OVER (PARTITION BY ao1.pessoa ORDER BY ao1.ID DESC) AS rn
                FROM dbo.Apontamento_Operador ao1
            )
            SELECT 
                Linha,
                Operacao,
                STRING_AGG(pessoa, ', ') AS Pessoas
            FROM UltimosStatus
            WHERE rn = 1 AND Status = 'Entrada'
            GROUP BY Linha, Operacao
            ORDER BY Linha, Operacao;
        `;
            const result = await pool.request().query(query);
            res.status(200).json(result.recordset);
        } catch (err) {
            console.error('Erro ao buscar pessoas com último status Entrada:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    getApontamentosOperadorDia: async (req, res) => {

        const { linha } = req.query;
        if (!linha) {
            return res.status(400).json({ error: 'Parâmetro "linha" é obrigatório.' });
        }
        try {
            const pool = await poolPromiseAcessos;

            const query = `
                SELECT 
                    Operacao, 
                    SUM(CASE 
                        WHEN Status = 'Entrada' THEN 1 
                        WHEN Status = 'Saida' THEN -1 
                        ELSE 0 
                    END) as Qntd_Real
                FROM 
                    dbo.Apontamento_Operador
                WHERE 
                    Linha = @linha 
                GROUP BY 
                    Operacao;
            `;

            const result = await pool.request()
                .input('linha', sql.VarChar, linha)
                .query(query);
            res.status(200).json(result.recordset);
        } catch (err) {
            console.error('Erro ao buscar apontamentos do dia:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    registrarSaidasPendentes: async (req, res) => {
        try {
            const maquinaSelecionada = req.query.maquina;

            if (!maquinaSelecionada) {
                return res.status(400).json({ error: 'O parâmetro "maquina" é obrigatório na query string.' });
            }

            const pool = await poolPromiseAcessos;

            const maquinasPermitidasResult = await pool.request()
                .query(`
                    SELECT DISTINCT Linha FROM dbo.Apontamento_Operador;
                `);
            const maquinasPermitidas = maquinasPermitidasResult.recordset.map(row => row.Linha);

            if (!maquinasPermitidas.includes(maquinaSelecionada)) {
                return res.status(400).json({ error: `Máquina "${maquinaSelecionada}" não é permitida ou não foi encontrada nos registros existentes.` });
            }

            const apontamentosResult = await pool.request()
                .input('maquina', sql.VarChar(50), maquinaSelecionada)
                .query(`
                SELECT
                    RE, Pessoa, Operacao, Cargo, Linha, Qntd_Esperada, Qntd_Real, Status, prod_LE, prod_LD, prod_Unico, Planta
                FROM dbo.Apontamento_Operador
                WHERE Linha = @maquina
                ORDER BY Data ASC, Hora ASC;
            `);

            const apontamentos = apontamentosResult.recordset;
            const pendentes = {};

            for (const apontamento of apontamentos) {
                const chave = `${apontamento.RE}-${apontamento.Pessoa}-${apontamento.Linha}-${apontamento.Operacao}-${apontamento.Planta}`;

                if (!pendentes[chave]) {
                    pendentes[chave] = { entradas: 0, saidas: 0, dadosEntrada: [] };
                }

                if (apontamento.Status === 'Saida') {
                    pendentes[chave].saidas += 1;
                } else {
                    pendentes[chave].entradas += 1;
                    pendentes[chave].dadosEntrada.push(apontamento);
                }
            }

            const horaAtual = new Date().getHours();
            let turnoAtual;
            if (horaAtual >= 6 && horaAtual < 14) turnoAtual = "1º Turno";
            else if (horaAtual >= 14 && horaAtual < 22) turnoAtual = "2º Turno";
            else turnoAtual = "3º Turno";

            let inseridos = 0;

            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                for (const chave in pendentes) {
                    const { entradas, saidas, dadosEntrada } = pendentes[chave];
                    const diferenca = entradas - saidas;

                    if (diferenca > 0) {
                        for (let i = 0; i < diferenca; i++) {
                            const base = dadosEntrada[i];

                            if (!base) continue;

                            const insertRequest = new sql.Request(transaction);

                            insertRequest
                                .input('Turno', sql.VarChar(20), turnoAtual)
                                .input('RE', sql.VarChar(255), base.RE)
                                .input('Pessoa', sql.VarChar(100), base.Pessoa)
                                .input('Cargo', sql.VarChar(50), base.Cargo)
                                .input('Linha', sql.VarChar(50), base.Linha)
                                .input('Qntd_Esperada', sql.Int, base.Qntd_Esperada)
                                .input('Qntd_Real', sql.Int, base.Qntd_Real)
                                .input('Operacao', sql.VarChar(50), base.Operacao)
                                .input('prod_LE', sql.VarChar(100), base.prod_LE)
                                .input('prod_LD', sql.VarChar(100), base.prod_LD)
                                .input('prod_Unico', sql.VarChar(100), base.prod_Unico)
                                .input('Planta', sql.VarChar(100), base.Planta);

                            console.log(base);

                            await insertRequest.query(`
                            INSERT INTO dbo.Apontamento_Operador
                            (Data, Turno, RE, Pessoa, Cargo, Linha, Qntd_Esperada, Qntd_Real, Operacao, Hora, Status, prod_LE, prod_LD, prod_Unico, Planta)
                            VALUES (
                                CAST(GETDATE() AS DATE),
                                @Turno,
                                @RE,
                                @Pessoa, 
                                @Cargo, 
                                @Linha, 
                                @Qntd_Esperada, 
                                @Qntd_Real, 
                                @Operacao, 
                                CAST(GETDATE() AS TIME),
                                'Saida',
                                @prod_LE,
                                @prod_LD,
                                @prod_Unico,
                                @Planta
                            )
                        `);

                            inseridos++;
                        }
                    }
                }

                await transaction.commit();
                res.status(200).json({ message: `${inseridos} saídas automáticas para máquina "${maquinaSelecionada}" registradas com sucesso.`, total: inseridos });

            } catch (insertError) {
                await transaction.rollback();
                throw insertError;
            }

        } catch (err) {
            console.error('Erro ao registrar saídas pendentes:', err);
            res.status(500).json({ error: 'Erro interno ao registrar saídas pendentes.' });
        }
    },

    verificarEntradaRecente: async (req, res) => {
        const Planta = req.query.Planta;
        const RE = req.query.RE;


        if (!RE) {
            return res.status(400).json({ error: 'RE é obrigatório.' });
        }

        try {
            const pool = await poolPromiseAcessos;
            const result = await pool.request()
                .input('Planta', sql.VarChar, Planta)
                .input('RE', sql.VarChar, RE)
                .query(`
                SELECT TOP 1 
                    Status,
                    Linha AS linha,
                    Operacao AS operacao,
                    prod_LE AS prod_LE,
                    prod_LD AS prod_LD,
                    prod_Unico AS prod_Unico,
                    Qntd_Esperada AS esperado
                FROM dbo.Apontamento_Operador
                WHERE Planta = @Planta and RE = @RE
                ORDER BY ID DESC
            `);

            const ultimo = result.recordset[0];

            if (!ultimo) {
                return res.json({ podeSair: false, linha: null, operacao: null, prod_LE: null, prod_LD: null, prod_Unico: null, esperado: null });
            }

            const { Status, linha, operacao, prod_LE, prod_LD, prod_Unico, esperado } = ultimo;

            if (Status === 'Entrada') {
                return res.json({ podeSair: true, linha, operacao, prod_LE, prod_LD, prod_Unico, esperado });
            } else {
                return res.json({ podeSair: false, linha, operacao, prod_LE, prod_LD, prod_Unico, esperado });
            }

        } catch (error) {
            console.error('Erro ao verificar entrada recente:', error);
            return res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    getOperadoresApontados: async (req, res) => {
        try {
            const pool = await poolPromiseAcessos;

            const query = `
                SELECT 
    Operacao AS Maquina,
    SUM(CASE 
        WHEN Status = 'Entrada' THEN 1
        WHEN Status = 'Saida' THEN -1
        ELSE 0
    END) AS Qntd_Real
FROM 
    dbo.Apontamento_Operador
GROUP BY 
    Operacao;
            `;

            const result = await pool.request().query(query);

            return res.status(200).json(result.recordset);
        } catch (err) {
            console.error("Erro ao executar a consulta:", err);
            return res.status(500).json({ error: 'Erro ao buscar dados da metalização.' });
        }
    },

    getEsperado: async (req, res) => {
        try {
            const pool = await poolPromiseAcessos;

            const linhasResult = await pool.request().query(`
            SELECT DISTINCT linha
            FROM dbo.Apontamento_TL
            WHERE linha IS NOT NULL
        `);

            const linhas = linhasResult.recordset.map(row => row.linha);
            const resultados = {};

            for (const linha of linhas) {
                const result = await pool.request().query(`
                DECLARE @produzindoId INT = (
                    SELECT MAX(id)
                    FROM dbo.Apontamento_TL
                    WHERE linha = '${linha}'
                    AND status_turno = 'Produzindo'
                );

                DECLARE @finalizadoMaisRecente INT = (
                    SELECT MAX(id)
                    FROM dbo.Apontamento_TL
                    WHERE linha = '${linha}'
                    AND status_turno = 'Finalizado'
                );

                IF @finalizadoMaisRecente IS NOT NULL AND @produzindoId IS NOT NULL AND @finalizadoMaisRecente > @produzindoId
                BEGIN
                    SELECT '${linha}' AS linha, NULL AS esperado, NULL AS produto;
                END
                ELSE
                BEGIN
                    SELECT TOP 1
                        '${linha}' AS linha,
                        Qntd_Esperada AS esperado,
                        prod_LE AS prod_LE,
                        prod_LD AS prod_LD,
                        prod_Unico AS prod_Unico
                    FROM dbo.Apontamento_TL
                    WHERE linha = '${linha}'
                    AND status_turno = 'Produzindo'
                    ORDER BY id DESC;
                END
            `);

                const resultado = result.recordset[0];
                const key = linha.replaceAll(' ', '');
                resultados[`esperado${key}`] = {
                    esperado: resultado?.esperado ?? null,
                    prod_LE: resultado?.prod_LE ?? null,
                    prod_LD: resultado?.prod_LD ?? null,
                    prod_Unico: resultado?.prod_Unico ?? null,
                };
            }

            res.status(200).json(resultados);

        } catch (err) {
            console.error('Erro ao buscar os dados das linhas:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }

    },

    getOperadoresPorMaquina: async (req, res) => {
        const { planta, machineId } = req.params;

        let pool;
        try {
            pool = await poolPromiseControlId;

            const decodedMachineId = decodeURIComponent(machineId).trim();
            const normalizedMachineId = decodedMachineId.toLowerCase();

            const machineGroupMap = {
                's.la01st & s.la02st': ['s.LA01st', 's.LA02st'],
                's.la03gm & s.la04gm': ['s.LA03gm', 's.LA04gm'],
                's.la05gm & s.la06gm': ['s.LA05gm', 's.LA06gm'],
                's.la07re & s.la08re': ['s.LA07re', 's.LA08re']
            };

            const machineIds = machineGroupMap[normalizedMachineId] || [decodedMachineId];
            const machinePlaceholders = machineIds.map((_, index) => `@machine${index}`).join(',');
            const plantaBanco = planta === 'MJN'
                ? '[SERVIDOR_RH_JARINU].[mjn_dle].[dbo].[Users]'
                : 'acesso.dbo.Users';

            const request = pool.request();
            machineIds.forEach((id, index) => {
                request.input(`machine${index}`, sql.VarChar, id);
            });

            request.input('planta', sql.VarChar, planta);

            const result = await request.query(`
                WITH RankedApontamentos AS (
                    SELECT
                        ID,
                        RE,
                        Pessoa,
                        Linha,
                        Status,
                        Turno AS TurnoApontado,
                        CAST(Data AS DATETIME) + CAST(Hora AS DATETIME) AS DataHora,
                        ROW_NUMBER() OVER (PARTITION BY RE ORDER BY ID DESC) AS rn,
                        PlantaSigla AS Planta
                    FROM [acessos].[dbo].[vw_Apontamentos_Com_Planta]
                ),
                OperadoresAtivosNaMaquina AS (
                    SELECT 
                        ID,
                        RE,
                        Pessoa,
                        TurnoApontado,
                        DataHora AS DataHoraEntrada
                    FROM RankedApontamentos
                    WHERE rn = 1 
                    AND Status = 'Entrada'
                    AND Linha = (${machinePlaceholders})
                    AND Planta = @planta
                )
                SELECT 
                    oa.RE,
                    oa.Pessoa,
                    oa.TurnoApontado,
                    oa.DataHoraEntrada,
                    u.Cracha,
                    u.TurnoCadastro,
                    (
                        SELECT TOP 1 
                            CAST(saida.Data AS DATETIME) + CAST(saida.Hora AS DATETIME)
                        FROM [acessos].[dbo].[Apontamento_Operador] saida
                        WHERE saida.RE = oa.RE
                        AND saida.Status = 'Saida'
                        AND saida.ID < oa.ID
                        ORDER BY saida.ID DESC
                    ) AS DataHoraSaida
                FROM OperadoresAtivosNaMaquina oa
                LEFT JOIN (
                    SELECT 
                        registration AS Cracha,
                        comments AS TurnoCadastro,
                        ROW_NUMBER() OVER(PARTITION BY registration ORDER BY id DESC) as rn_user
                    FROM ${plantaBanco}
                ) u 
                    ON LTRIM(RTRIM(CAST(oa.RE AS VARCHAR))) = LTRIM(RTRIM(u.Cracha))
                AND u.rn_user = 1

                ORDER BY oa.Pessoa;
        `);

            res.json(result.recordset);

        } catch (err) {
            console.error(`[CONTROLLER ERROR] Erro ao buscar operadores para a máquina ${machineId}:`);
            console.error('Mensagem:', err.message);
            console.error('Stack:', err.stack);
            console.error('Objeto completo:', JSON.stringify(err, null, 2));
            res.status(500).json({ error: err.message }); // ← retorna o erro real para o frontend também
        }
    },
    /*******************************************************/
    /*******************************************************/
    /**********************JARINU***************************/
    /*******************************************************/
    /*******************************************************/

    getUltimoApontamentoPorIp_JARINU: async (req, res) => {
        try {
            const { ip } = req.params;
            const pool = await poolPromiseAcessos;

            const query = `
            WITH RankedLogs AS (
                SELECT TOP 1
                    ID_Log_Original AS id,
                    Nome_Colaborador AS nome,
                    Matricula as RE,
                    Cargo AS cargo,
                    IP_Dispositivo AS ipDispositivo
                FROM
                    dbo.vw_log_acessos_mjn
                WHERE
                     IP_Dispositivo = @ip 
                ORDER BY ID_Log_Original DESC
            )
            SELECT
                id,
                nome,
                RE,
                cargo,
                ipDispositivo
            FROM
                RankedLogs;
        `;

            const result = await pool.request()
                .input('ip', sql.NVarChar, ip)
                .query(query);

            if (result.recordset.length === 0) {
                return res.status(404).json({ message: `Nenhum registro qualificado encontrado para o IP ${ip}.` });
            }

            res.status(200).json(result.recordset[0]);

        } catch (err) {
            console.error(`Erro ao buscar último registro para o IP ${req.params.ip}:`, err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    getProdutosPorLinha_JARINU: async (req, res) => {
        try {
            const pool = await poolPromiseAcessos;

            const result = await pool.request().query(`
            SELECT 
                lm.descricao AS LinhaNome,
                p.descricao AS ProdutoDescricao,
                p.cod_prod AS ProdutoCodigo
            FROM cadastros_mjn.dbo.Produtos AS p
            INNER JOIN cadastros_mjn.dbo.Linha_Maquinas AS lm
                ON p.id_Linha_Maquina = lm.id
            ORDER BY lm.descricao, p.descricao;
        `);

            const registros = result.recordset;

            if (registros.length === 0) {
                return res.status(404).json({ message: 'Nenhum produto encontrado com linhas associadas.' });
            }

            const agrupadoPorLinha = {};

            registros.forEach(row => {
                const { LinhaNome, ProdutoDescricao, ProdutoCodigo } = row;

                if (!agrupadoPorLinha[LinhaNome]) {
                    agrupadoPorLinha[LinhaNome] = {
                        linha: LinhaNome,
                        produtos: []
                    };
                }

                agrupadoPorLinha[LinhaNome].produtos.push({
                    codigo: ProdutoCodigo,
                    descricao: ProdutoDescricao
                });
            });

            const resultadoFinal = Object.values(agrupadoPorLinha);

            res.status(200).json(resultadoFinal);

        } catch (err) {
            console.error('Erro ao buscar produtos por linha:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    getProdutos_JARINU: async (req, res) => {
        try {
            const pool = await poolPromiseAcessos;
            const result = await pool.request().query(`
            SELECT DISTINCT
                pa.ID_PROD,
                pa.DESCRICAO,
                pa.COD_LE,
                pa.COD_LD,
                pa.COD_AMBOS,
                c.MAQUINA
            FROM
                [cadastros_mjn].[dbo].[Prod_Aux] pa
            LEFT JOIN
                [cadastros_mjn].[dbo].[Carga] c
                ON COALESCE(pa.COD_LE, pa.COD_LD, pa.COD_AMBOS) = c.PRODUTO
            ORDER BY
                pa.ID_PROD, c.MAQUINA;
        `);

            const registros = result.recordset;
            if (!registros.length) {
                return res.status(404).json({ message: 'Nenhum produto encontrado com linhas associadas.' });
            }

            const agrupadoPorMaquina = registros.reduce((acc, currentRecord) => {
                const { MAQUINA, DESCRICAO, COD_LE, COD_LD, COD_AMBOS } = currentRecord;

                const chave = MAQUINA || 'Sem Máquina';
                if (!acc[chave]) {
                    acc[chave] = {
                        maquina: chave,
                        produtos: []
                    };
                }

                acc[chave].produtos.push({
                    produto: DESCRICAO,
                    cod_le: COD_LE,
                    cod_ld: COD_LD,
                    cod_unico: COD_AMBOS
                });
                return acc;
            }, {});

            res.status(200).json(Object.values(agrupadoPorMaquina));

        } catch (err) {
            console.error('[API ERRO] getProdutos:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    createApontamentoTL_JARINU: async (req, res) => {
        console.log('BACKEND RECEBEU:', req.body);
        const { turno, RE, pessoa, cargo, linha, qntd_esperada, status_turno, prod_LE, prod_LD, prod_Unico } = req.body;

        if (!turno || !RE || !pessoa || !cargo || !linha || qntd_esperada == null || !status_turno) {
            console.log('VALIDAÇÃO FALHOU: Campos obrigatórios ausentes.');
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        try {
            const pool = await poolPromiseAcessos;

            /* const isLinhaSemProduto = maquinasSemProduto.includes(linha);
    
            if (!isLinhaSemProduto) { 
                const valido = await validarLinhaEProduto(linha, prod_LE, prod_LD, prod_Unico);
                if (!valido) {
                    return res.status(400).json({ error: `O produto(s) fornecido(s) não está(ão) corretamente associado(s) à linha "${linha}".` });
                }
            } else {
                console.log(`Linha "${linha}" está na lista de máquinas sem produto, pulando validação de produto.`);
            } */


            if (status_turno === 'Produzindo') {
                const resultUltimo = await pool.request()
                    .input('Linha', sql.VarChar(50), linha)
                    .query(`
                    SELECT TOP 1 status_turno
                    FROM dbo.Apontamento_TL
                    WHERE Linha = @Linha
                    ORDER BY Data DESC, id DESC
                `);

                const ultimoStatus = resultUltimo.recordset[0]?.status_turno;

                if (ultimoStatus === 'Produzindo') {
                    return res.status(400).json({
                        error: `A linha "${linha}" já está em produção. Finalize o último apontamento antes de criar um novo.`
                    });
                }
            }

            const request = pool.request();
            request.input('Turno', sql.VarChar(20), turno);
            request.input('Pessoa', sql.VarChar(100), pessoa);
            request.input('RE', sql.VarChar(255), RE);
            request.input('Cargo', sql.VarChar(50), cargo);
            request.input('Linha', sql.VarChar(50), linha);
            request.input('Qntd_Esperada', sql.Int, qntd_esperada);
            request.input('status_turno', sql.VarChar(50), status_turno);
            request.input('prod_LE', sql.VarChar(100), prod_LE);
            request.input('prod_LD', sql.VarChar(100), prod_LD);
            request.input('prod_Unico', sql.VarChar(100), prod_Unico);

            const query = `
            INSERT INTO dbo.Apontamento_TL
            (Data, Turno, RE, Pessoa, Cargo, Linha, Qntd_Esperada, status_turno, Hora, prod_LE, prod_LD, prod_Unico, Planta)
            VALUES (GETDATE(), @Turno, @RE, @Pessoa, @Cargo, @Linha, @Qntd_Esperada, @status_turno, CAST(GETDATE() AS TIME), @prod_LE, @prod_LD, @prod_Unico, 'MJN')
        `;

            await request.query(query);
            res.status(201).json({ message: 'Apontamento de TL criado com sucesso!' });

        } catch (err) {
            console.error('Erro ao inserir apontamento de TL:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },


    createApontamentoOperador_JARINU: async (req, res) => {
        console.log('BACKEND RECEBEU:', req.body);

        const { turno, RE, pessoa, cargo, linha, qntd_esperada, operacao, status, prod_LE, prod_LD, prod_Unico } = req.body;

        try {
            const pool = await poolPromiseAcessos;


            /* const isLinhaSemProduto = maquinasSemProduto.includes(linha);

            if (!isLinhaSemProduto) {
                const valido = await validarLinhaEProduto_JARINU(linha, prod_LE, prod_LD, prod_Unico);
                if (!valido) {
                    return res.status(400).json({ error: `O produto(s) fornecido(s) não está(ão) corretamente associado(s) à linha "${linha}".` });
                }
            } else {
                console.log(`Linha "${linha}" está na lista de máquinas sem produto, pulando validação de produto.`);
            } */
            // 1. Verificar duplicidade de Status (Entrada/Saida) nos últimos 5 segundos
            const checkDup = await pool.request()
                .input('Pessoa', sql.VarChar(200), pessoa)
                .input('RE', sql.VarChar(255), RE)
                .input('Status', sql.VarChar(50), status)
                .query(`
                    SELECT TOP 1 *
                    FROM dbo.Apontamento_Operador
                    WHERE Pessoa = @Pessoa
                    AND RE = @RE
                    AND Status = @Status
                    AND Data >= DATEADD(SECOND, -5, GETDATE())
                    ORDER BY Data DESC
                `);

            if (checkDup.recordset.length > 0) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: `Operação duplicada: já existe uma ${status} registrada recentemente.`,
                    tipo: "DUPLICADO"
                });
            }

            // 2. Inserir se não for duplicado
            const request = pool.request();
            request.input('Turno', sql.VarChar(20), turno);
            request.input('RE', sql.VarChar(255), RE);
            request.input('Pessoa', sql.VarChar(200), pessoa);
            request.input('Cargo', sql.VarChar(50), cargo);
            request.input('Linha', sql.VarChar(50), linha);
            request.input('Qntd_Esperada', sql.Int, qntd_esperada);
            request.input('Qntd_Real', sql.Int, 0);
            request.input('Operacao', sql.VarChar(50), operacao);
            request.input('Status', sql.VarChar(50), status);
            request.input('prod_LE', sql.VarChar(100), prod_LE);
            request.input('prod_LD', sql.VarChar(100), prod_LD);
            request.input('prod_Unico', sql.VarChar(100), prod_Unico);

            const query = `
                INSERT INTO dbo.Apontamento_Operador 
                (Data, Turno, RE, Pessoa, Cargo, Linha, Qntd_Esperada, Qntd_Real, Operacao, Hora, Status, prod_LE, prod_LD, prod_Unico, Planta)
                VALUES (GETDATE(), @Turno, @RE, @Pessoa, @Cargo, @Linha, @Qntd_Esperada, @Qntd_Real, @Operacao, CAST(GETDATE() AS TIME), @Status, @prod_LE, @prod_LD, @prod_Unico, 'MJN')
            `;

            await request.query(query);

            res.status(201).json({
                sucesso: true,
                mensagem: 'Apontamento registrado com sucesso.'
            });

        } catch (err) {
            console.error('Erro ao inserir apontamento do operador:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },
};

module.exports = apontamentoController;