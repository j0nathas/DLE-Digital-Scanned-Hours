const { sql, getPoolPromiseAcessos, getPoolPromiseCadastros } = require('../config/db');
const { getInfoMaquina } = require('../config/mapeamentoMaquinas');

// ─────────────────────────────────────────────────────────────────────────────
// Horários dos turnos por planta/tipo de setor
// ─────────────────────────────────────────────────────────────────────────────
const HORARIOS_TURNOS = {
    'MLB': {
        'default': {
            '1º Turno': { inicio: '06:15', fim: '14:15' },
            '2º Turno': { inicio: '14:15', fim: '22:15' },
            '3º Turno': { inicio: '22:15', fim: '06:15' }
        }
    },
    'MMB': {
        'INJEÇÃO': {
            '1º Turno': { inicio: '05:00', fim: '14:48' },
            '2º Turno': { inicio: '14:48', fim: '23:00' },
            '3º Turno': { inicio: '23:00', fim: '05:00' }
        },
        'default': {
            '1º Turno': { inicio: '05:00', fim: '14:48' },
            '2º Turno': { inicio: '14:48', fim: '00:13' },
            '3º Turno': { inicio: '00:13', fim: '05:00' }
        }
    },
    'MJN': {
        'default': {
            '1º Turno': { inicio: '06:00', fim: '15:00' },
            '2º Turno': { inicio: '15:00', fim: '23:00' },
            '3º Turno': { inicio: '23:00', fim: '06:00' }
        }
    },
    'DEFAULT': {
        'default': {
            '1º Turno': { inicio: '06:00', fim: '15:00' },
            '2º Turno': { inicio: '15:00', fim: '23:00' },
            '3º Turno': { inicio: '23:00', fim: '06:00' }
        }
    }
};

/**
 * Converte "HH:MM" em minutos desde meia-noite
 */
const horaParaMinutos = (hhmm) => {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/**
 * Dado um horário de entrada (HH:MM), planta e setor,
 * retorna o nome do turno correspondente conforme HORARIOS_TURNOS.
 */
const resolverTurnoMaquina = (entrada, planta, setor) => {
    if (!entrada || entrada === '--:--') return 'N/D';

    const plantaMap = HORARIOS_TURNOS[planta] || HORARIOS_TURNOS['DEFAULT'];
    // Tenta achar pelo setor exato, senão usa 'default'
    const turnos = plantaMap[setor] || plantaMap['default'] || HORARIOS_TURNOS['DEFAULT']['default'];

    const minEntrada = horaParaMinutos(entrada);

    for (const [nomeTurno, faixa] of Object.entries(turnos)) {
        const ini = horaParaMinutos(faixa.inicio);
        const fim = horaParaMinutos(faixa.fim);

        // Turno que não vira a meia-noite
        if (ini < fim) {
            if (minEntrada >= ini && minEntrada < fim) return nomeTurno;
        } else {
            // Turno que vira a meia-noite (ex: 22:15 → 06:15)
            if (minEntrada >= ini || minEntrada < fim) return nomeTurno;
        }
    }
    return 'N/D';
};

/**
 * Resolve planta e centro de custo para máquinas unificadas (com "_" ou " & ")
 * Tenta a chave completa primeiro; se não achar, tenta cada parte separada.
 */
const resolverInfoMaquina = (codigoMaquina) => {
    // Normaliza separador para "_"
    const codigoNorm = codigoMaquina.replace(/ & /g, '_');

    // 1. Tenta o código completo
    const infoCompleto = getInfoMaquina(codigoNorm);
    if (infoCompleto.planta !== 'N/A') return infoCompleto;

    // 2. Se tiver "_", tenta com a primeira parte
    if (codigoNorm.includes('_')) {
        const primeiraParte = codigoNorm.split('_')[0];
        const infoParte = getInfoMaquina(primeiraParte);
        if (infoParte.planta !== 'N/A') return infoParte;
    }

    return { planta: 'N/A', setor: 'NÃO MAPEADO' };
};

/**
 * Determina a planta de uma máquina pelo prefixo do código,
 * usado como fallback quando o mapeamento não encontra.
 * J. → MJN | S. → MLB | V. → MMB
 */
const plantaPorPrefixo = (codigo) => {
    if (!codigo) return null;
    const upper = codigo.toUpperCase().trim();
    if (upper.startsWith('J.')) return 'MJN';
    if (upper.startsWith('S.')) return 'MLB';
    if (upper.startsWith('V.')) return 'MMB';
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Retorna o layout das máquinas agrupado por setor
 */
exports.getMaquinasLayout = async (req, res) => {
    const { plantaSigla } = req.params;
    let poolCadastros;
    try {
        poolCadastros = await getPoolPromiseCadastros(plantaSigla);
        const result = await poolCadastros.request()
            .input('PlantaSigla', sql.VarChar, plantaSigla.toUpperCase())
            .query(`
                SELECT 
                    s.descricao AS Setor, 
                    lm.descricao AS NomeMaquina
                FROM dbo.Linha_Maquinas AS lm
                INNER JOIN dbo.Setor AS s ON lm.id_setor = s.id
                INNER JOIN dbo.Planta AS p ON lm.id_planta = p.id
                WHERE p.descricao = @PlantaSigla AND lm.descricao <> 'MONTAGEM MANUAL'
                ORDER BY s.id, lm.descricao;
            `);
        const layoutPorSetor = result.recordset.reduce((acc, maquina) => {
            const { Setor, NomeMaquina } = maquina;
            if (!acc[Setor]) acc[Setor] = [];
            acc[Setor].push(NomeMaquina);
            return acc;
        }, {});
        const layoutFinal = {};
        for (const sectorName in layoutPorSetor) {
            const maquinasIndividuais = layoutPorSetor[sectorName];
            const deveAgrupar =
                sectorName.toUpperCase().includes('LANTERNA') ||
                sectorName.toUpperCase().includes('FAROL');
            if (deveAgrupar) {
                const maquinasAgrupadas = [];
                let i = 0;
                while (i < maquinasIndividuais.length) {
                    const maquinaAtual = maquinasIndividuais[i];
                    const proximaMaquina = maquinasIndividuais[i + 1];
                    const match = maquinaAtual.match(/(\d+)/);
                    let formouPar = false;
                    if (match && proximaMaquina) {
                        const numeroStr = match[1];
                        const numero = parseInt(numeroStr, 10);
                        if (numero % 2 !== 0) {
                            const proximoNumeroStr = (numero + 1).toString().padStart(numeroStr.length, '0');
                            const nomeEsperadoProxima = maquinaAtual.replace(numeroStr, proximoNumeroStr);
                            if (proximaMaquina === nomeEsperadoProxima) {
                                maquinasAgrupadas.push(`${maquinaAtual}_${proximaMaquina}`);
                                i += 2;
                                formouPar = true;
                            }
                        }
                    }
                    if (!formouPar) {
                        maquinasAgrupadas.push(maquinaAtual);
                        i += 1;
                    }
                }
                layoutFinal[sectorName] = maquinasAgrupadas;
            } else {
                layoutFinal[sectorName] = maquinasIndividuais;
            }
        }
        res.json(layoutFinal);
    } catch (err) {
        console.error(`Erro ao buscar layout para a planta ${plantaSigla}:`, err);
        res.status(500).json({ error: 'Erro no servidor ao buscar layout.' });
    }
};

/**
 * 2. Retorna o saldo de apontamentos ativos vs meta por linha
 */
exports.getApontamentosAtivos = async (req, res) => {
    const { plantaSigla } = req.params;
    const { date } = req.query;
    if (date && isNaN(new Date(date))) {
        return res.status(400).json({ error: 'Erro: Formato de data inválido. Use AAAA-MM-DD.' });
    }
    let pool;
    try {
        const isMMB = plantaSigla.toUpperCase() === 'MMB';
        pool = await getPoolPromiseAcessos(plantaSigla);
        const plantaFilter = isMMB ? "" : "AND Planta = @PlantaSigla";
        const result = await pool.request()
            .input('PlantaSigla', sql.VarChar, plantaSigla.toUpperCase())
            .input('InputDate', sql.Date, date || null)
            .query(`
                DECLARE @DataAtual DATE = ISNULL(@InputDate, CAST(GETDATE() AS DATE));
                WITH SaldoPorLinha AS (
                    SELECT Linha,
                        SUM(CASE WHEN Status = 'Entrada' THEN 1 ELSE -1 END) AS SaldoOperadores
                    FROM [dbo].[Apontamento_Operador]
                    WHERE CAST(Data AS DATE) = @DataAtual ${plantaFilter}
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
                    SELECT Linha FROM SaldoPorLinha WHERE SaldoOperadores > 0
                    UNION
                    SELECT Linha FROM MetasAtuais
                )
                SELECT
                    aal.Linha,
                    ISNULL(CASE WHEN spl.SaldoOperadores < 0 THEN 0 ELSE spl.SaldoOperadores END, 0) as Atual,
                    ISNULL(ma.Qntd_Esperada, 0) as Meta
                FROM AllActiveLines aal
                LEFT JOIN SaldoPorLinha spl ON aal.Linha = spl.Linha
                LEFT JOIN MetasAtuais ma ON aal.Linha = ma.Linha;
            `);
        const dadosBrutos = result.recordset;
        const dadosUnificados = {};
        dadosBrutos.forEach(item => {
            let linhaUnificada = item.Linha;
            const linhaUpper = item.Linha.toUpperCase();
            if (['S.LA01ST', 'S.LA02ST'].includes(linhaUpper)) linhaUnificada = 's.LA01st_s.LA02st';
            else if (['S.LA03GM', 'S.LA04GM'].includes(linhaUpper)) linhaUnificada = 's.LA03gm_s.LA04gm';
            else if (['S.LA05GM', 'S.LA06GM'].includes(linhaUpper)) linhaUnificada = 's.LA05gm_s.LA06gm';
            else if (['S.LA07RE', 'S.LA08RE'].includes(linhaUpper)) linhaUnificada = 's.LA07re_s.LA08re';
            else if (['FA01', 'FA02'].includes(linhaUpper)) linhaUnificada = 'J.FA01_J.FA02';
            else if (['FA03', 'FA04'].includes(linhaUpper)) linhaUnificada = 'J.FA03_J.FA04';
            else if (['LA01', 'LA02'].includes(linhaUpper)) linhaUnificada = 'J.LA01_J.LA02';
            else if (['SC04', 'SC05'].includes(linhaUpper)) linhaUnificada = 'J.SC04_J.SC05';
            else if (['LA03', 'LA04'].includes(linhaUpper)) linhaUnificada = 'J.LA03_J.LA04';
            else if (item.Linha.startsWith('j.')) linhaUnificada = 'J' + item.Linha.slice(1);
            if (!dadosUnificados[linhaUnificada]) {
                dadosUnificados[linhaUnificada] = { atual: 0, meta: 0 };
            }
            dadosUnificados[linhaUnificada].atual += item.Atual;
            if (item.Meta > 0) dadosUnificados[linhaUnificada].meta = item.Meta;
        });
        const dataFinal = {};
        for (const linha in dadosUnificados) {
            dataFinal[linha.replace(/_/g, ' & ')] = dadosUnificados[linha];
        }
        res.json(dataFinal);
    } catch (err) {
        console.error(`Erro na consulta de apontamentos para ${plantaSigla}:`, err);
        res.status(500).json({ error: 'Erro ao buscar dados do servidor.' });
    }
};

/**
 * 3. Retorna os detalhes dos operadores atualmente logados em uma máquina
 */
exports.getOperadoresPorMaquina = async (req, res) => {
    const { plantaSigla } = req.params;
    const machineId = req.query.machineId || req.params.machineId;
    if (!machineId) return res.status(400).json({ error: 'ID da máquina não fornecido.' });
    let pool;
    try {
        const isMMB = plantaSigla.toUpperCase() === 'MMB';
        pool = await getPoolPromiseAcessos(plantaSigla);
        const decodedMachineId = decodeURIComponent(machineId).trim();
        let machineIds = [decodedMachineId];
        if (decodedMachineId.includes('_')) machineIds = machineIds.concat(decodedMachineId.split('_'));
        const request = pool.request();
        const machinePlaceholders = machineIds.map((id, index) => {
            const paramName = `m${index}`;
            request.input(paramName, sql.VarChar, id);
            return `@${paramName}`;
        }).join(',');
        let userDbName = isMMB ? 'mcb_dle' : 'controlid';
        const result = await request.query(`
            WITH RankedApontamentos AS (
                SELECT Pessoa, Linha, Status, Turno AS TurnoApontado,
                    CAST(Data AS DATETIME) + CAST(Hora AS DATETIME) AS DataHora,
                    ROW_NUMBER() OVER (PARTITION BY Pessoa ORDER BY ID DESC) AS rn
                FROM [dbo].[Apontamento_Operador]
            )
            SELECT oa.Pessoa, oa.TurnoApontado, oa.DataHora AS DataHoraEntrada,
                u.registration AS Cracha, u.comments AS TurnoCadastro
            FROM RankedApontamentos oa
            LEFT JOIN (
                SELECT name, registration, comments,
                    ROW_NUMBER() OVER(PARTITION BY name ORDER BY id DESC) as rn_user
                FROM ${userDbName}.dbo.Users
            ) u ON oa.Pessoa = u.name COLLATE Latin1_General_CI_AI AND u.rn_user = 1
            WHERE oa.rn = 1 AND oa.Status = 'Entrada' AND oa.Linha IN (${machinePlaceholders})
            ORDER BY oa.Pessoa;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(`[ERRO DETALHE]`, err);
        res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};

/**
 * 4. Retorna as sessões de apontamento para cálculo de DLE por período
 */
exports.getApontamentosPorPeriodoDLE = async (req, res) => {
    const { plantaSigla } = req.params;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Data de início e fim são obrigatórias.' });
    let pool;
    try {
        const isMMB = plantaSigla.toUpperCase() === 'MMB';
        const colRE = isMMB ? "Chapa" : "RE";
        const plantaFilter = isMMB ? "" : "AND Planta = @Planta";
        pool = await getPoolPromiseAcessos(plantaSigla);
        let userDbName = isMMB ? 'mcb_dle' : 'controlid';
        const result = await pool.request()
            .input('Planta', sql.VarChar, plantaSigla.toUpperCase())
            .input('Start', sql.Date, startDate)
            .input('End', sql.Date, endDate)
            .query(`
                WITH Punches AS (
                    SELECT ${colRE} AS RE_Original, Pessoa, Linha, Data, Turno, Status,
                        CAST(Data AS DATETIME) + CAST(Hora AS DATETIME) as Timestamp
                    FROM [dbo].[Apontamento_Operador]
                    WHERE Data BETWEEN @Start AND @End ${plantaFilter}
                ),
                Sessions AS (
                    SELECT RE_Original, Pessoa, Linha, Data, Turno, Status, Timestamp,
                        LEAD(Timestamp) OVER (PARTITION BY Pessoa, Linha ORDER BY Timestamp) as ProximoTimestamp,
                        LEAD(Status) OVER (PARTITION BY Pessoa, Linha ORDER BY Timestamp) as ProximoStatus
                    FROM Punches
                )
                SELECT u.registration AS RE, s.Pessoa AS Nome, s.Linha,
                    CONVERT(VARCHAR(10), s.Data, 120) as Data, s.Turno,
                    DATEDIFF(SECOND, s.Timestamp, s.ProximoTimestamp) as DuracaoSegundos
                FROM Sessions s
                LEFT JOIN (
                    SELECT name, registration, ROW_NUMBER() OVER(PARTITION BY name ORDER BY id DESC) as rn
                    FROM ${userDbName}.dbo.Users
                ) u ON s.Pessoa = u.name COLLATE Latin1_General_CI_AI AND u.rn = 1
                WHERE s.Status = 'Entrada' AND s.ProximoStatus = 'Saida'
                  AND DATEDIFF(SECOND, s.Timestamp, s.ProximoTimestamp) > 0
                  AND DATEDIFF(SECOND, s.Timestamp, s.ProximoTimestamp) < 50400
                ORDER BY s.Data DESC, s.Pessoa ASC;
            `);
        const recordset = result.recordset.map(item => {
            let linhaUnificada = item.Linha;
            const lU = (item.Linha || '').toUpperCase();
            if (['S.LA01ST', 'S.LA02ST'].includes(lU)) linhaUnificada = 'S.LA01ST_S.LA02ST';
            else if (['S.LA03GM', 'S.LA04GM'].includes(lU)) linhaUnificada = 'S.LA03GM_S.LA04GM';
            else if (['S.LA05GM', 'S.LA06GM'].includes(lU)) linhaUnificada = 'S.LA05GM_S.LA06GM';
            else if (['S.LA07RE', 'S.LA08RE'].includes(lU)) linhaUnificada = 'S.LA07RE_S.LA08RE';
            else if (['J.FA01', 'J.FA02', 'FA01', 'FA02'].includes(lU)) linhaUnificada = 'J.FA01_J.FA02';
            else if (['J.FA03', 'J.FA04', 'FA03', 'FA04'].includes(lU)) linhaUnificada = 'J.FA03_J.FA04';
            else if (['J.LA01', 'J.LA02', 'LA01', 'LA02'].includes(lU)) linhaUnificada = 'J.LA01_J.LA02';
            return { ...item, Linha: linhaUnificada };
        });
        res.json(recordset);
    } catch (err) {
        console.error(`[DLE ERROR]`, err.message);
        res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};

/**
 * 5. Retorna logs agrupados por Operador → Dia → Turno do Operador → sessões
 *    Cada sessão inclui: turnoOperador, turnoMaquina, centroCusto
 *    Filtra registros pela planta correta usando mapeamento + prefixo
 */
exports.getOperadoresDetalhado = async (req, res) => {
    const { startDate, endDate, plantaFiltro } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Datas obrigatórias.' });

    const plantasConsultar = plantaFiltro
        ? [plantaFiltro.toUpperCase()]
        : ['MLB', 'MMB', 'MJN'];

    const consolidado = [];

    try {
        for (const sigla of plantasConsultar) {
            let pool;
            try {
                pool = await getPoolPromiseAcessos(sigla);
            } catch (e) {
                console.error(`Erro no pool ${sigla}:`, e.message);
                continue;
            }

            const result = await pool.request()
                .input('Start', sql.Date, startDate)
                .input('End', sql.Date, endDate)
                .query(`
                    WITH Punches AS (
                        SELECT Pessoa, Linha, Turno, Data, Status,
                            CAST(Data AS DATETIME) + CAST(Hora AS DATETIME) as Timestamp
                        FROM [dbo].[Apontamento_Operador]
                        WHERE Data BETWEEN @Start AND @End
                    ),
                    Sessions AS (
                        SELECT Pessoa, Linha, Turno, Data, Status, Timestamp,
                            LEAD(Timestamp) OVER (PARTITION BY Pessoa ORDER BY Timestamp) as ProximoTimestamp,
                            LEAD(Status)    OVER (PARTITION BY Pessoa ORDER BY Timestamp) as ProximoStatus
                        FROM Punches
                    )
                    SELECT
                        s.Pessoa   AS Nome,
                        s.Turno    AS TurnoOperador,
                        s.Linha,
                        CONVERT(VARCHAR(10), s.Data, 120)         AS DataLog,
                        CONVERT(VARCHAR(5),  s.Timestamp, 108)    AS Entrada,
                        CONVERT(VARCHAR(5),  s.ProximoTimestamp, 108) AS Saida,
                        DATEDIFF(SECOND, s.Timestamp, s.ProximoTimestamp) / 3600.0 AS Horas
                    FROM Sessions s
                    WHERE s.Status = 'Entrada'
                      AND (s.ProximoStatus = 'Saida' OR s.ProximoStatus = 'Entrada')
                      AND DATEDIFF(SECOND, s.Timestamp, s.ProximoTimestamp) > 0
                    ORDER BY s.Pessoa, s.Data, s.Turno, s.Timestamp;
                `);

            if (result.recordset.length === 0) continue;

            const mapOperadores = new Map();

            result.recordset.forEach(r => {
                // ── Resolve info da máquina (suporta nomes unificados) ──────────
                const infoMaquina = resolverInfoMaquina(r.Linha);

                // ── Filtra pela planta correta ──────────────────────────────────
                // 1. Tenta pelo mapeamento
                let plantaMaquina = infoMaquina.planta !== 'N/A' ? infoMaquina.planta : null;
                // 2. Fallback: prefixo do código
                if (!plantaMaquina) plantaMaquina = plantaPorPrefixo(r.Linha);

                // Descarta se a máquina claramente pertence a outra planta
                if (plantaMaquina && plantaMaquina !== sigla) return;

                const centroCusto = infoMaquina.setor !== 'NÃO MAPEADO'
                    ? infoMaquina.setor
                    : (plantaMaquina ? `${plantaMaquina} - NÃO MAPEADO` : 'NÃO MAPEADO');

                // ── Turno da máquina pelo horário de entrada ────────────────────
                const turnoMaquina = resolverTurnoMaquina(
                    r.Entrada,
                    plantaMaquina || sigla,
                    infoMaquina.setor
                );

                // ── Agrupamento: Operador → Dia → TurnoOperador ─────────────────
                if (!mapOperadores.has(r.Nome)) {
                    mapOperadores.set(r.Nome, { nome: r.Nome, dias: new Map() });
                }
                const operador = mapOperadores.get(r.Nome);

                if (!operador.dias.has(r.DataLog)) {
                    operador.dias.set(r.DataLog, new Map());
                }
                const dia = operador.dias.get(r.DataLog);

                const turnoKey = r.TurnoOperador || 'S/T';
                if (!dia.has(turnoKey)) {
                    dia.set(turnoKey, { turno: turnoKey, sessoes: [], totalHoras: 0 });
                }
                const turnoEntry = dia.get(turnoKey);

                const horas = parseFloat(r.Horas || 0);
                turnoEntry.sessoes.push({
                    entrada:        r.Entrada,
                    saida:          r.Saida || '--:--',
                    maquina:        r.Linha,
                    centroCusto,
                    turnoOperador:  r.TurnoOperador || 'S/T',
                    turnoMaquina,
                    horas
                });
                turnoEntry.totalHoras += horas;
            });

            if (mapOperadores.size === 0) continue;

            const operadoresArray = Array.from(mapOperadores.values()).map(op => ({
                nome: op.nome,
                dias: Array.from(op.dias.entries()).map(([data, turnosMap]) => ({
                    data,
                    totalHorasDia: parseFloat(
                        Array.from(turnosMap.values())
                            .reduce((s, t) => s + t.totalHoras, 0)
                            .toFixed(2)
                    ),
                    turnos: Array.from(turnosMap.values()).map(t => ({
                        turno:      t.turno,
                        totalHoras: parseFloat(t.totalHoras.toFixed(2)),
                        sessoes:    t.sessoes
                    }))
                }))
            }));

            consolidado.push({ nome: sigla, operadores: operadoresArray });
        }

        res.json(consolidado);
    } catch (e) {
        console.error('Erro interno:', e);
        res.status(500).json({ error: e.message });
    }
};