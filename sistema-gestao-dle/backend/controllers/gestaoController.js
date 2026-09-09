const { sql, getPoolPromiseAcessos, getPoolPromiseCadastros, getPoolPromiseEGA } = require('../config/db');
const { getInfoMaquina } = require('../config/mapeamentoMaquinas');

const EGA_CONFIG = {
    tabelaMovimentacao: '[PCPMOV].[dbo].[MOVIMENTACAO]',
    tabelaOperador: '[PCPMOV].[dbo].[OPERADOR]',
    tabelaMaquinas: '[PCPMOV].[dbo].[MAQUINAS]'
};

// --- GESTÃO: CONTAGEM DE CARDS (DLE) ---
exports.getContagemCards = async (req, res) => {
    const { plantaSigla } = req.params;
    const { date } = req.query;
    try {
        const pool = await getPoolPromiseAcessos(plantaSigla);
        const result = await pool.request()
            .input('PS', sql.VarChar, plantaSigla.toUpperCase())
            .input('ID', sql.Date, date || null)
            .query(`
                DECLARE @DF DATE = ISNULL(@ID, CAST(GETDATE() AS DATE));
                WITH UltimoStatus AS (
                    SELECT 
                        LTRIM(RTRIM(COALESCE(NULLIF(Linha, ''), Operacao))) as MaquinaID,
                        Status,
                        ROW_NUMBER() OVER(PARTITION BY Pessoa ORDER BY Data DESC, Hora DESC, ID DESC) as rn
                    FROM [dbo].[Apontamento_Operador]
                    WHERE CAST(Data AS DATE) = @DF
                ),
                ContagemReal AS (
                    SELECT MaquinaID, COUNT(*) as Total FROM UltimoStatus 
                    WHERE rn = 1 AND Status = 'Entrada' GROUP BY MaquinaID
                ),
                Metas AS (
                    SELECT LTRIM(RTRIM(Linha)) as LinhaMeta, Qntd_Esperada FROM (
                        SELECT Linha, Qntd_Esperada, status_turno, ROW_NUMBER() OVER(PARTITION BY Linha ORDER BY Data DESC, ID DESC) as rn
                        FROM [dbo].[Apontamento_TL] WHERE CAST(Data AS DATE) <= @DF AND (Planta = @PS OR Planta IS NULL OR Planta = '')
                    ) AS H WHERE rn = 1 AND status_turno = 'Produzindo'
                )
                SELECT ISNULL(c.MaquinaID, m.LinhaMeta) as Linha, ISNULL(c.Total, 0) as Atual, ISNULL(m.Qntd_Esperada, 0) as Meta 
                FROM ContagemReal c FULL OUTER JOIN Metas m ON c.MaquinaID = m.LinhaMeta 
                WHERE (ISNULL(c.MaquinaID, m.LinhaMeta) LIKE 's.%');
            `);

        const unificados = {};
        result.recordset.forEach(item => {
            let nome = item.Linha.trim();
            if (['S.LA01ST', 'S.LA02ST'].includes(nome.toUpperCase())) nome = 's.LA01st_s.LA02st';
            else if (['S.LA03GM', 'S.LA04GM'].includes(nome.toUpperCase())) nome = 's.LA03gm_s.LA04gm';
            else if (['S.LA05GM', 'S.LA06GM'].includes(nome.toUpperCase())) nome = 's.LA05gm_s.LA06gm';
            else if (['S.LA07RE', 'S.LA08RE'].includes(nome.toUpperCase())) nome = 's.LA07re_s.LA08re';

            if (!unificados[nome]) unificados[nome] = { atual: 0, meta: 0 };
            unificados[nome].atual += item.Atual;
            if (item.Meta > 0) unificados[nome].meta = item.Meta;
        });

        const final = {};
        for (const k in unificados) final[k.replace(/_/g, ' & ')] = unificados[k];
        res.json(final);
    } catch (e) { res.status(500).json({ error: e.message }); }
};


// --- GESTÃO: DETALHES DO MODAL ---
exports.getOperadoresPorMaquina = async (req, res) => {
    const { plantaSigla, machineId } = req.params;
    try {
        const poolAcessos = await getPoolPromiseAcessos(plantaSigla);
        const poolEGA = await getPoolPromiseEGA();
        const decoded = decodeURIComponent(machineId).trim();
        
        // Criamos uma lista de IDs para buscar (Ex: [s.LA01st_s.LA02st, s.LA01st, s.LA02st])
        let searchIds = [decoded, decoded.replace(/ & /g, '_')];
        searchIds = searchIds.concat(decoded.split(/[&_]/).map(s => s.trim()));
        const uniqueIds = [...new Set(searchIds)];

        const requestAcessos = poolAcessos.request();
        const placeholders = uniqueIds.map((id, i) => { 
            requestAcessos.input(`m${i}`, sql.VarChar, id); 
            return `@m${i}`; 
        }).join(',');

        let userDb = plantaSigla.toUpperCase() === 'MMB' ? 'mcb_dle' : 'acesso';

        const queryDLE = `
            DECLARE @Hoje DATE = CAST(GETDATE() AS DATE);
            WITH UltimoStatus AS (
                SELECT Pessoa, Linha, Operacao, Status, Turno, 
                CAST(Data AS DATETIME) + CAST(Hora AS DATETIME) AS DataHora,
                ROW_NUMBER() OVER (PARTITION BY Pessoa ORDER BY Data DESC, Hora DESC, ID DESC) AS rn
                FROM [dbo].[Apontamento_Operador] WHERE CAST(Data AS DATE) = @Hoje
            )
            SELECT DISTINCT oa.Pessoa, oa.DataHora AS DataHoraEntrada, oa.Turno as TurnoApontado, u.RE, u.TurnoCadastro,
            (SELECT TOP 1 CAST(Data AS DATETIME) + CAST(Hora AS DATETIME) FROM [dbo].[Apontamento_Operador] WHERE Pessoa = oa.Pessoa AND Status = 'Saida' AND ID < (SELECT MAX(ID) FROM [dbo].[Apontamento_Operador] WHERE Pessoa = oa.Pessoa) ORDER BY ID DESC) AS UltimaSaida
            FROM UltimoStatus oa
            LEFT JOIN (SELECT name, registration as RE, comments as TurnoCadastro, ROW_NUMBER() OVER(PARTITION BY name ORDER BY id DESC) as rn_u FROM ${userDb}.dbo.Users) u ON oa.Pessoa = u.name COLLATE Latin1_General_CI_AI AND u.rn_u = 1
            WHERE oa.rn = 1 AND oa.Status = 'Entrada' 
              AND (LTRIM(RTRIM(oa.Linha)) IN (${placeholders}) OR LTRIM(RTRIM(oa.Operacao)) IN (${placeholders}))
        `;

        const [resDLE, resEGA] = await Promise.all([
            requestAcessos.query(queryDLE),
            poolEGA.request().query(`SELECT LTRIM(RTRIM(o.NOME)) as Pessoa, m.DATA_HORA as DataHoraEntrada FROM [PCPMOV].[dbo].[MOVIMENTACAO_OPERADOR] m INNER JOIN [PCPMOV].[dbo].[OPERADORES] o ON m.OPERADOR = o.OPERADOR INNER JOIN [PCPMOV].[dbo].[MAQUINAS] maq ON m.MAQUINA = maq.MAQUINA WHERE maq.NOME_DA_MAQUINA IN (${uniqueIds.map(id => `'${id}'`).join(',')}) AND m.DATA_FIM IS NULL`).catch(() => ({ recordset: [] }))
        ]);
        res.json({ dle: resDLE.recordset, ega: resEGA.recordset });
    } catch (err) { res.status(500).json({ error: err.message }); }
};


// --- OUTRAS FUNÇÕES ---
exports.getMaquinasLayout = async (req, res) => {
    const { plantaSigla } = req.params;
    try {
        const pool = await getPoolPromiseCadastros(plantaSigla);
        const result = await pool.request().input('P', sql.VarChar, plantaSigla.toUpperCase()).query(`
            SELECT s.descricao AS Setor, lm.descricao AS NomeMaquina FROM dbo.Linha_Maquinas AS lm
            INNER JOIN dbo.Setor AS s ON lm.id_setor = s.id INNER JOIN dbo.Planta AS p ON lm.id_planta = p.id
            WHERE p.descricao = @P AND lm.descricao <> 'MONTAGEM MANUAL' ORDER BY s.id, lm.descricao;
        `);
        const layout = result.recordset.reduce((acc, m) => { if (!acc[m.Setor]) acc[m.Setor] = []; acc[m.Setor].push(m.NomeMaquina); return acc; }, {});
        const final = {};
        for (const setor in layout) {
            const maqs = layout[setor];
            if (/LANTERNA|FAROL/i.test(setor)) {
                const ag = []; let i = 0;
                while (i < maqs.length) {
                    let m1 = maqs[i], m2 = maqs[i+1], match = m1.match(/(\d+)/), ok = false;
                    if (match && m2) {
                        let n = parseInt(match[1]);
                        if (n % 2 !== 0) {
                            let n2 = (n+1).toString().padStart(match[1].length, '0');
                            if (m2 === m1.replace(match[1], n2)) { ag.push(`${m1}_${m2}`); i+=2; ok=true; }
                        }
                    }
                    if (!ok) { ag.push(m1); i++; }
                }
                final[setor] = ag;
            } else final[setor] = maqs;
        }
        res.json(final);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getContagemEGA = async (req, res) => {
    try {
        const pool = await getPoolPromiseEGA();
        const result = await pool.request().query(`SELECT d.NOME_DA_MAQUINA as Linha, u.PESSOAS as Contagem FROM (SELECT MAQUINA, PESSOAS, ROW_NUMBER() OVER(PARTITION BY MAQUINA ORDER BY RECID DESC) as rn FROM ${EGA_CONFIG.tabelaMovimentacao} WHERE CAST(DATAI AS DATE) = CAST(GETDATE() AS DATE)) u INNER JOIN ${EGA_CONFIG.tabelaMaquinas} d ON d.MAQUINA = u.MAQUINA WHERE u.rn = 1;`);
        const d = {}; result.recordset.forEach(r => { if(r.Linha) d[r.Linha.trim().toLowerCase()] = r.Contagem; });
        res.json(d);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getCadastroOperadores = async (req, res) => {
    try {
        const pool = await getPoolPromiseEGA();
        const result = await pool.request().query(`SELECT LTRIM(RTRIM(DESCRICAO)) as Linha, PESSOAS as Valor FROM ${EGA_CONFIG.tabelaOperador} WHERE DESCRICAO IS NOT NULL AND DESCRICAO <> 'SEM OPERADOR'`);
        const d = {}; result.recordset.forEach(r => { if(r.Linha) d[r.Linha.trim().toLowerCase()] = Number(r.Valor) || 0; });
        res.json(d);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOperadoresDetalhado = async (req, res) => { res.json([]); };
exports.getApontamentosOperadorDia = async (req, res) => { res.json([]); };
exports.getPessoasComUltimoStatusEntrada = async (req, res) => { res.json([]); };
exports.getApontamentosPorPeriodoDLE = async (req, res) => { res.json([]); };

module.exports = {
    getMaquinasLayout: exports.getMaquinasLayout,
    getContagemCards: exports.getContagemCards,
    getContagemEGA: exports.getContagemEGA,
    getCadastroOperadores: exports.getCadastroOperadores,
    getOperadoresPorMaquina: exports.getOperadoresPorMaquina,
    getOperadoresDetalhado: exports.getOperadoresDetalhado,
    getApontamentosOperadorDia: exports.getApontamentosOperadorDia,
    getPessoasComUltimoStatusEntrada: exports.getPessoasComUltimoStatusEntrada,
    getApontamentosPorPeriodoDLE: exports.getApontamentosPorPeriodoDLE
};