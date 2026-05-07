const { getPoolPromiseRH, sql } = require('../config/db');
const axios = require('axios');

const configAPI = {
    tokenUrl: "https://gmagna.dtm.com.br/mobileapi/token",
    viewUrl: "https://gmagna.dtm.com.br/mobileapi/api/v1.0/Integracao/View",
    codigoApp: "eypVIn+4BVDmYUwcyaGP/v86aWyFqL0w5EpWTlJNEFGPPUGcUlYosBkc4WAj14teutwMYa+EnfNVo5rPJmdqLA==",
    usuario: "Integração",
    senha: "Integração"
};

const rhSyncController = {
    syncData: async (req, res) => {
        const { dataInicio, dataFim, empresa } = req.query; // Ex: ?dataInicio=2026-02-01&dataFim=2026-02-28&empresa=710

        try {
            // 1. Obter Token
            const params = new URLSearchParams();
            params.append('grant_type', 'password');
            params.append('username', configAPI.usuario);
            params.append('password', configAPI.senha);
            params.append('CodigoApp', configAPI.codigoApp);

            const tokenResp = await axios.post(configAPI.tokenUrl, params);
            const token = tokenResp.data.access_token;

            const pool = await getPoolPromiseRH('MLB');

            // 2. Função para processar e salvar cada View
            async function processarView(viewNome, tabelaDestino, colunaDataFiltro) {
                const pWhere = `Codigo_Empresa = ${empresa} AND ${colunaDataFiltro} >= '${dataInicio}' AND ${colunaDataFiltro} <= '${dataFim}'`;
                const url = `${configAPI.viewUrl}?pWhere=${encodeURIComponent(pWhere)}&pNome=${viewNome}`;

                const dataResp = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
                const lista = dataResp.data;

                if (lista && lista.length > 0) {
                    // Limpamos os dados do período antes de inserir novos para evitar duplicidade
                    await pool.request().query(`DELETE FROM ${tabelaDestino} WHERE Codigo_Empresa = ${empresa} AND ${colunaDataFiltro} >= '${dataInicio}' AND ${colunaDataFiltro} <= '${dataFim}'`);

                    for (const item of lista) {
                        const request = pool.request();
                        // Montagem dinâmica simples de Insert baseada nas chaves do JSON
                        const colunas = Object.keys(item).join(', ');
                        const valores = Object.keys(item).map(k => {
                            const val = item[k];
                            if (val === null || val === undefined) return 'NULL';
                            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                            return val;
                        }).join(', ');

                        await request.query(`INSERT INTO ${tabelaDestino} (${colunas}) VALUES (${valores})`);
                    }
                }
                return lista.length;
            }

            // 3. Executar sincronização das 3 tabelas
            const totalTrab = await processarView('View_Integracao_Trabalhador', 'Cadastro_trabalhador', 'Data_Admissao');
            const totalDias = await processarView('View_Integracao_Marcacao_Dia', 'Dias_Marcacao', 'Data_Marcacao');
            const totalHE = await processarView('View_Integracao_Marcacao_Hora_Extra', 'Hora_Extra', 'Data_Marcacao');

            res.json({
                sucesso: true,
                importados: { trabalhadores: totalTrab, dias: totalDias, horas_extras: totalHE }
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = rhSyncController;