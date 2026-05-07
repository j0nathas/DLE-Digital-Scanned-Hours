const { getPoolPromiseRH, sql } = require('../config/db');
const { obterGrupoPorCC, obterSiglaPlanta } = require('../config/mapeamentoCentroCusto');

const rhController = {

    /**
     * Indicadores de RH AGREGADOS (MOD / Horas Trabalhadas por Setor)
     * Filtra apenas Mão de Obra Direta via INNER JOIN
     */
    getIndicadoresRH: async (req, res) => {
        const { startDate, endDate, planta } = req.query;

        try {
            const pool = await getPoolPromiseRH('MLB');

            let empresaFilter = "";
            if (planta && planta !== 'TODAS') {
                const empresaId = planta === 'MLB' ? 1 : (planta === 'MJN' ? 2 : 4);
                empresaFilter = `AND v.Codigo_Empresa = ${empresaId}`;
            }

            const query = `
                SELECT 
                    v.Codigo_Empresa AS Planta,
                    v.SetorOriginal,
                    v.DataRef,
                    v.Numero_Turno AS Turno,
                    v.Codigo_CentroCusto,
                    c.Tipo_Mao_Obra, -- ADICIONADO NO SELECT
                    SUM(v.TotalHoras) AS TotalHoras
                FROM vw_Resumo_MOD_Diario v
                INNER JOIN Cadastro_trabalhador c 
                    ON v.Codigo_Registro = c.Codigo_Registro 
                    AND v.Codigo_Empresa = c.Codigo_Empresa
                WHERE v.DataRef BETWEEN @start AND @end
                AND c.Tipo_Mao_Obra = 'D'
                ${empresaFilter}
                GROUP BY 
                    v.Codigo_Empresa,
                    v.SetorOriginal,
                    v.DataRef,
                    v.Numero_Turno,
                    v.Codigo_CentroCusto,
                    c.Tipo_Mao_Obra -- ADICIONADO NO GROUP BY
                ORDER BY v.DataRef DESC
            `;

            const result = await pool.request()
                .input('start', sql.Date, startDate || '2025-01-01')
                .input('end', sql.Date, endDate || '2026-12-31')
                .query(query);

            const dadosMapeados = result.recordset
                .map(row => {
                    const grupoMapeado = obterGrupoPorCC(row.Planta, row.Codigo_CentroCusto, row.SetorOriginal);

                    return {
                        Planta: obterSiglaPlanta(row.Planta),
                        DataRef: row.DataRef,
                        Turno: row.Turno,
                        Codigo_CentroCusto: row.Codigo_CentroCusto,
                        TotalHoras: row.TotalHoras,
                        NomeOriginalSetor: row.SetorOriginal,
                        SetorOriginal: grupoMapeado,
                        TipoMaoObra: row.Tipo_Mao_Obra // ADICIONADO NO RETORNO
                    };
                })
                .filter(item => item.SetorOriginal !== 'NÃO PRODUTIVO');

            res.json(dadosMapeados);

        } catch (err) {
            console.error('❌ Erro ao buscar indicadores RH:', err.message);
            res.status(500).json({ error: err.message });
        }
    },

    /**
     * Indicadores de RH DETALHADOS (Por Operador/RE)
     */
    getIndicadoresOperadoresRH: async (req, res) => {
        const { startDate, endDate, planta } = req.query;

        try {
            const pool = await getPoolPromiseRH('MLB');

            let empresaFilter = "";
            if (planta && planta !== 'TODAS') {
                const empresaId = planta === 'MLB' ? 1 : (planta === 'MJN' ? 2 : 4);
                empresaFilter = `AND v.Codigo_Empresa = ${empresaId}`;
            }

            const query = `
                SELECT 
                    v.Codigo_Empresa AS Planta,
                    v.Codigo_CentroCusto,
                    v.SetorOriginal,
                    v.Codigo_Registro AS RE,
                    v.Nome_Registro AS Nome,
                    v.DataRef,
                    v.Numero_Turno AS Turno,
                    c.Tipo_Mao_Obra, -- ADICIONADO NO SELECT
                    v.TotalHoras
                FROM vw_Resumo_MOD_Diario v
                INNER JOIN Cadastro_trabalhador c 
                    ON v.Codigo_Registro = c.Codigo_Registro 
                    AND v.Codigo_Empresa = c.Codigo_Empresa
                WHERE v.DataRef BETWEEN @start AND @end
                AND c.Tipo_Mao_Obra = 'D'
                ${empresaFilter}
                ORDER BY v.DataRef DESC
            `;

            const result = await pool.request()
                .input('start', sql.Date, startDate || '2025-01-01')
                .input('end', sql.Date, endDate || '2026-12-31')
                .query(query);

            const dadosMapeados = result.recordset
                .map(row => {
                    const grupoMapeado = obterGrupoPorCC(row.Planta, row.Codigo_CentroCusto, row.SetorOriginal);

                    return {
                        Planta: obterSiglaPlanta(row.Planta),
                        DataRef: row.DataRef,
                        RE: row.RE,
                        Nome: row.Nome,
                        TotalHoras: row.TotalHoras,
                        SetorOriginal: grupoMapeado,
                        TipoMaoObra: row.Tipo_Mao_Obra // ADICIONADO NO RETORNO
                    };
                })
                .filter(item => item.SetorOriginal !== 'NÃO PRODUTIVO');

            res.json(dadosMapeados);

        } catch (err) {
            console.error('❌ Erro ao buscar indicadores individuais RH:', err.message);
            res.status(500).json({ error: err.message });
        }
    },

    getLimitesDatas: async (req, res) => {
        try {
            const pool = await getPoolPromiseRH('MLB');
            const result = await pool.request().query(`
                SELECT MIN(DataRef) AS min, MAX(DataRef) AS max FROM vw_Resumo_MOD_Diario
            `);
            res.json(result.recordset[0]);
        } catch (err) {
            console.error('❌ Erro ao buscar limites de data RH:', err.message);
            res.json({ min: '2025-01-01', max: '2026-12-31' });
        }
    }
};

module.exports = rhController;