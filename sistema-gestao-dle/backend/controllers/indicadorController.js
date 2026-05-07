const { sql, getPoolPromiseAcessos, getPoolPromiseCadastros } = require('../config/db');

/**
 * Função Auxiliar para as rotas de validação do server.js
 */
async function getRawApontamentos(planta, startDate, endDate) {
    const pool = await getPoolPromiseAcessos(planta);
    const result = await pool.request()
        .input('StartDate', sql.Date, startDate)
        .input('EndDate', sql.Date, endDate)
        .query(`SELECT TOP 500 * FROM dbo.Apontamento_Operador WHERE Data BETWEEN @StartDate AND @EndDate ORDER BY ID DESC`);
    return result.recordset;
}

/**
 * INDICADORES FÁBRICA (SCANNED HOURS + GRÁFICOS)
 */
exports.getIndicadoresFabrica = async (req, res) => {
    const { startDate, endDate, nivel = 'planta', filtroPlanta, filtroSetor, filtroLinha } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Datas obrigatórias.' });
    const plantasParaConsultar = ['MLB', 'MMB', 'MJN'];

    try {
        const processarDadosPorPlanta = async (siglaPlanta) => {
            let machineMap = {};
            let apontamentos = [];
            
            try {
                const poolCadastros = await getPoolPromiseCadastros(siglaPlanta);
                const mapResult = await poolCadastros.request()
                    .query(`SELECT p.descricao AS PlantaSigla, 'Planta ' + p.descricao AS PlantaNome, s.descricao AS Setor, lm.descricao AS NomeMaquina FROM dbo.Linha_Maquinas lm INNER JOIN dbo.Setor s ON lm.id_setor = s.id INNER JOIN dbo.Planta p ON lm.id_planta = p.id;`);
                
                mapResult.recordset.forEach(item => {
                    machineMap[item.NomeMaquina.toUpperCase().trim()] = {
                        PlantaSigla: item.PlantaSigla, PlantaNome: item.PlantaNome, Setor: item.Setor
                    };
                });
            } catch (error) { console.error(`[ERRO CADASTROS ${siglaPlanta}]`, error.message); return []; }

            try {
                const poolAcessos = await getPoolPromiseAcessos(siglaPlanta);
                const dataResult = await poolAcessos.request()
                    .input('StartDate', sql.Date, startDate)
                    .input('EndDate', sql.Date, endDate)
                    .query(`
                        WITH Pares AS (
                            SELECT ID, Data, Turno, Pessoa, Linha, Status, Hora, 
                            LEAD(Hora, 1) OVER (PARTITION BY Pessoa, Data, Linha ORDER BY ID) AS ProximaHora, 
                            LEAD(Status, 1) OVER (PARTITION BY Pessoa, Data, Linha ORDER BY ID) AS ProximoStatus 
                            FROM dbo.Apontamento_Operador 
                            WHERE Data BETWEEN @StartDate AND @EndDate
                        )
                        SELECT Linha, Turno, Data, DATEDIFF(second, Hora, ProximaHora) AS DuracaoSegundos
                        FROM Pares
                        WHERE Status = 'Entrada' AND ProximoStatus = 'Saida';
                    `);
                apontamentos = dataResult.recordset;
            } catch (error) { console.error(`[ERRO ACESSOS ${siglaPlanta}]`, error.message); return []; }

            return apontamentos.map(apontamento => {
                const linhaID = apontamento.Linha.toUpperCase().trim();
                let machineInfo = machineMap[linhaID];
                if (!machineInfo && linhaID.includes('_')) {
                    const primeiraParte = linhaID.split('_')[0];
                    machineInfo = machineMap[primeiraParte];
                }
                if (!machineInfo || !apontamento.DuracaoSegundos || apontamento.DuracaoSegundos <= 0) return null;
                if (machineInfo.PlantaSigla.toUpperCase() !== siglaPlanta.toUpperCase()) return null;
                return { ...apontamento, ...machineInfo };
            }).filter(Boolean);
        };

        const promises = plantasParaConsultar.map(processarDadosPorPlanta);
        const resultadosPorPlanta = await Promise.all(promises);
        const periodos = [].concat(...resultadosPorPlanta);

        let periodosFiltrados = periodos;
        if (filtroPlanta && filtroPlanta !== 'undefined') {
            periodosFiltrados = periodosFiltrados.filter(p => p.PlantaSigla === filtroPlanta);
        }
        if (nivel === 'maquina' && filtroSetor) {
            periodosFiltrados = periodosFiltrados.filter(p => p.Setor === filtroSetor);
        } else if (nivel === 'turno') {
            if (filtroSetor) periodosFiltrados = periodosFiltrados.filter(p => p.Setor === filtroSetor);
            if (filtroLinha) {
                const linhaFormatada = filtroLinha.replace(/ & /g, '_').toUpperCase();
                periodosFiltrados = periodosFiltrados.filter(p => p.Linha.toUpperCase() === linhaFormatada);
            }
        }

        let labelField = (nivel === 'planta') ? 'PlantaNome' : (nivel === 'setor') ? 'Setor' : 'Linha';
        if (nivel === 'turno') labelField = 'Turno';
        
        const dadosAgregados = periodosFiltrados.reduce((acc, p) => { 
            const label = String(p[labelField]).replace(/_/g, ' & '); 
            if (!acc[label]) acc[label] = { totalSegundos: 0, sigla: p.PlantaSigla }; 
            acc[label].totalSegundos += p.DuracaoSegundos; 
            return acc; 
        }, {});

        const graficoBarras = { 
            labels: Object.keys(dadosAgregados), 
            data: Object.values(dadosAgregados).map(d => (d.totalSegundos / 3600).toFixed(2)),
            siglas: Object.values(dadosAgregados).map(d => d.sigla)
        };
        const top5Piores = Object.entries(dadosAgregados).sort(([, a], [, b]) => b.totalSegundos - a.totalSegundos).slice(0, 5).map(([name, data]) => ({ name, value: (data.totalSegundos / 3600).toFixed(2) }));

        const todosOsDias = []; 
        let dataAtual = new Date(startDate+'T00:01:00'); let dataFim = new Date(endDate+'T00:01:00'); 
        while (dataAtual <= dataFim) { todosOsDias.push(dataAtual.toISOString().split('T')[0]); dataAtual.setDate(dataAtual.getDate() + 1); }
        
        const detalhePorDia = periodosFiltrados.reduce((acc, curr) => { 
            const dia = new Date(curr.Data).toISOString().split('T')[0]; 
            let subLabel = curr[labelField];
            if (!acc[dia]) acc[dia] = {}; 
            if (!acc[dia][subLabel]) acc[dia][subLabel] = 0; 
            acc[dia][subLabel] += curr.DuracaoSegundos; 
            return acc; 
        }, {});
        
        const seriesDiarias = [...new Set(periodosFiltrados.map(p => p[labelField]))].map(subLabel => ({ 
            name: subLabel.replace(/_/g, ' & '), type: 'bar', stack: 'total',
            data: todosOsDias.map(dia => ((detalhePorDia[dia]?.[subLabel] || 0) / 3600).toFixed(2)) 
        }));

        const listaDetalhada = periodosFiltrados.map(p => ({
            PlantaSigla: p.PlantaSigla, Setor: p.Setor, Linha: p.Linha,
            Data: p.Data ? new Date(p.Data).toISOString().split('T')[0] : '',
            DuracaoSegundos: p.DuracaoSegundos
        }));

        res.json({ graficoBarras, top5Piores, graficoDiario: { labels: todosOsDias, series: seriesDiarias }, listaDetalhada });
    } catch (err) { console.error(err); res.status(500).send('Erro no servidor.'); }
};

exports.validarDadosMLB = async (req, res) => { try { res.json(await getRawApontamentos('MLB', req.query.startDate, req.query.endDate)); } catch (e) { res.status(500).json({ error: e.message }); } };
exports.validarDadosMJN = async (req, res) => { try { res.json(await getRawApontamentos('MJN', req.query.startDate, req.query.endDate)); } catch (e) { res.status(500).json({ error: e.message }); } };
exports.validarDadosMMB = async (req, res) => { try { res.json(await getRawApontamentos('MMB', req.query.startDate, req.query.endDate)); } catch (e) { res.status(500).json({ error: e.message }); } };