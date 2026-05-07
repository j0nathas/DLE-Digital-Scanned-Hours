const { sql, getPoolPromiseAcessos } = require('../config/db');

const MAPA_LINHAS_AGRUPADAS = {
    // MLB - Montagem Lanterna
    'S.LA01ST': 's.LA01st_s.LA02st',
    'S.LA02ST': 's.LA01st_s.LA02st',
    'S.LA03GM': 's.LA03gm_s.LA04gm',
    'S.LA04GM': 's.LA03gm_s.LA04gm',
    'S.LA05GM': 's.LA05gm_s.LA06gm',
    'S.LA06GM': 's.LA05gm_s.LA06gm',
    'S.LA07RE': 's.LA07re_s.LA08re',
    'S.LA08RE': 's.LA07re_s.LA08re',
    // MJN - Farol / Lanterna
    'FA01':   'J.FA01_J.FA02',
    'FA02':   'J.FA01_J.FA02',
    'J.FA01': 'J.FA01_J.FA02',
    'J.FA02': 'J.FA01_J.FA02',
    'FA03':   'J.FA03_J.FA04',
    'FA04':   'J.FA03_J.FA04',
    'J.FA03': 'J.FA03_J.FA04',
    'J.FA04': 'J.FA03_J.FA04',
    'LA01':   'J.LA01_J.LA02',
    'LA02':   'J.LA01_J.LA02',
    'J.LA01': 'J.LA01_J.LA02',
    'J.LA02': 'J.LA01_J.LA02',
    'LA03':   'J.LA03_J.LA04',
    'LA04':   'J.LA03_J.LA04',
    'SC04':   'J.SC04_J.SC05',
    'SC05':   'J.SC04_J.SC05',
};

function resolverLinhasNoBanco(decodedMachineId) {
    if (decodedMachineId.includes('_')) {
        const partes = decodedMachineId.split('_');
        return [decodedMachineId, ...partes];
    }
    return [decodedMachineId];
}

// ============================================================
// 1. Contagem dos Cards (Atual / Meta)
// ============================================================
exports.getContagemCards = async (req, res) => {
    const { plantaSigla } = req.params;
    const { date } = req.query;
    let pool;
    try {
        pool = await getPoolPromiseAcessos(plantaSigla);
        const isMMB = plantaSigla.toUpperCase() === 'MMB';
        const plantaFilter = isMMB ? "" : "AND Planta = @PlantaSigla";

        const query = `
            DECLARE @DataAtual DATE = ISNULL(@InputDate, CAST(GETDATE() AS DATE));

            WITH UltimoEventoPorPessoaLinha AS (
                SELECT
                    Pessoa, Linha, Status,
                    ROW_NUMBER() OVER (PARTITION BY Pessoa, Linha ORDER BY ID DESC) AS rn
                FROM [dbo].[Apontamento_Operador]
                WHERE CAST(Data AS DATE) = @DataAtual
                ${plantaFilter}
            ),
            OperadoresAtivos AS (
                SELECT Linha, COUNT(*) AS Atual
                FROM UltimoEventoPorPessoaLinha
                WHERE rn = 1 AND Status = 'Entrada'
                GROUP BY Linha
            ),
            MetasAtuais AS (
                SELECT Linha, Qntd_Esperada
                FROM (
                    SELECT Linha, Qntd_Esperada, status_turno,
                           ROW_NUMBER() OVER(PARTITION BY Linha ORDER BY Data DESC, ID DESC) as rn
                    FROM [dbo].[Apontamento_TL]
                    WHERE [Data] <= @DataAtual
                ) AS HistoricoMetas
                WHERE rn = 1 AND status_turno = 'Produzindo'
            ),
            AllActiveLines AS (
                SELECT Linha FROM OperadoresAtivos
                UNION
                SELECT Linha FROM MetasAtuais
            )
            SELECT
                aal.Linha,
                ISNULL(oa.Atual, 0) AS Atual,
                ISNULL(ma.Qntd_Esperada, 0) AS Meta
            FROM AllActiveLines aal
            LEFT JOIN OperadoresAtivos oa ON aal.Linha = oa.Linha
            LEFT JOIN MetasAtuais ma      ON aal.Linha = ma.Linha;
        `;

        const result = await pool.request()
            .input('PlantaSigla', sql.VarChar, plantaSigla.toUpperCase())
            .input('InputDate',   sql.Date,    date || null)
            .query(query);

        const dadosUnificados = {};
        result.recordset.forEach(item => {
            const linhaUpper  = (item.Linha || '').toUpperCase();
            const chaveMapeada = MAPA_LINHAS_AGRUPADAS[linhaUpper];
            const chave = chaveMapeada
                ? chaveMapeada.replace(/_/g, ' & ')
                : item.Linha.replace(/_/g, ' & ');

            if (!dadosUnificados[chave]) {
                dadosUnificados[chave] = { atual: 0, meta: 0 };
            }
            dadosUnificados[chave].atual += item.Atual;
            if (item.Meta > 0) {
                dadosUnificados[chave].meta = item.Meta;
            }
        });

        res.json(dadosUnificados);
    } catch (err) {
        console.error('[GESTAO] Erro ao buscar contagens:', err);
        res.status(500).json({ error: 'Erro ao buscar contagens.' });
    }
};

// ============================================================
// 2. Detalhes do Modal — operadores logados em uma máquina
// ============================================================
exports.getOperadoresNaMaquina = async (req, res) => {
    const { plantaSigla, machineId } = req.params;
    let pool;
    try {
        pool = await getPoolPromiseAcessos(plantaSigla);
        const isMMB    = plantaSigla.toUpperCase() === 'MMB';
        const userDb   = isMMB ? 'mcb_dle' : 'controlid';

        const decodedId     = decodeURIComponent(machineId).trim();
        const linhasNoBanco = resolverLinhasNoBanco(decodedId);

        const request = pool.request();
        linhasNoBanco.forEach((id, i) => {
            request.input(`m${i}`, sql.VarChar, id);
        });

        const whereConditions = linhasNoBanco
            .map((_, i) => `Linha COLLATE Latin1_General_CI_AI = @m${i}`)
            .join(' OR ');

        const query = `
            DECLARE @DataAtual DATE = CAST(GETDATE() AS DATE);

            WITH TodosApontamentos AS (
                SELECT
                    Pessoa, Linha, Status, Turno,
                    CAST(Data AS DATETIME) + CAST(Hora AS DATETIME) AS DataHora,
                    ID
                FROM [dbo].[Apontamento_Operador]
                WHERE CAST(Data AS DATE) = @DataAtual
                  AND (${whereConditions})
            ),
            UltimoEventoPorPessoaLinha AS (
                SELECT
                    Pessoa, Linha, Status, Turno, DataHora,
                    ROW_NUMBER() OVER (PARTITION BY Pessoa, Linha ORDER BY ID DESC) AS rn
                FROM TodosApontamentos
            ),
            OperadoresAtivos AS (
                SELECT Pessoa, Linha, Turno AS TurnoApontado, DataHora AS DataHoraEntrada
                FROM UltimoEventoPorPessoaLinha
                WHERE rn = 1 AND Status = 'Entrada'
            ),
            UltimaSaidaPorPessoa AS (
                SELECT Pessoa, Linha, DataHora AS DataHoraSaida,
                       ROW_NUMBER() OVER (PARTITION BY Pessoa, Linha ORDER BY ID DESC) AS rn_saida
                FROM TodosApontamentos
                WHERE Status = 'Saida'
            )
            SELECT
                oa.Pessoa,
                oa.TurnoApontado,
                oa.DataHoraEntrada,
                us.DataHoraSaida,
                u.registration AS Cracha,
                u.comments     AS TurnoCadastro
            FROM OperadoresAtivos oa
            LEFT JOIN UltimaSaidaPorPessoa us
                ON oa.Pessoa = us.Pessoa AND oa.Linha = us.Linha AND us.rn_saida = 1
            LEFT JOIN (
                SELECT name, registration, comments,
                       ROW_NUMBER() OVER (PARTITION BY name ORDER BY id DESC) AS rn_user
                FROM ${userDb}.dbo.Users
            ) u ON oa.Pessoa = u.name COLLATE Latin1_General_CI_AI AND u.rn_user = 1
            ORDER BY oa.Pessoa;
        `;

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error('[GESTAO] Erro ao buscar detalhes:', err);
        res.status(500).json({ error: 'Erro ao buscar detalhes.', detalhe: err.message });
    }
};