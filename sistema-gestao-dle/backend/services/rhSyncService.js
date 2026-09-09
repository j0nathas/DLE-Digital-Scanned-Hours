const axios = require('axios');
const sql = require('mssql');
const { getPoolPromiseRH } = require('../config/db');

const configAPI = {
    tokenUrl: "https://gmagna.dtm.com.br/mobileapi/token",
    viewUrl: "https://gmagna.dtm.com.br/mobileapi/api/v1.0/Integracao/View",
    codigoApp: "eypVIn+4BVDmYUwcyaGP/v86aWyFqL0w5EpWTlJNEFGPPUGcUlYosBkc4WAj14teutwMYa+EnfNVo5rPJmdqLA==",
    usuario: "Integração", senha: "Integração",
    empresasArray: ['001', '002', '003', '004', '006', '700', '702', '703', '710', '720', '721'],
    get empresasString() { return this.empresasArray.map(e => `'${e}'`).join(','); }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getAccessToken() {
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("username", configAPI.usuario);
    params.append("password", configAPI.senha);
    params.append("CodigoApp", configAPI.codigoApp);
    const resp = await axios.post(configAPI.tokenUrl, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return resp.data.access_token;
}

const rhSyncService = {
    async sync(dataInicio, dataFim) {
        console.log(`[SYNC RH] 🚀 Iniciando Sincronização Dupla (REP e DLE)...`);
        try {
            const token = await getAccessToken();
            const poolsAlvo = ['MLB_REP', 'MLB_DLE']; 

            for (const alvo of poolsAlvo) {
                console.log(`\n--- 🖥️  SERVIDOR: ${alvo} ---`);
                const pool = await getPoolPromiseRH(alvo);

                console.log("👤 Sincronizando Trabalhadores...");
                await this.processarViewBulk(token, pool, 'vw.V_11A027_Trabalhador', 'Cadastro_trabalhador', 'Data_Admissao', '2000-01-01', dataFim);

                let dataCursor = new Date(dataInicio + 'T00:00:00');
                const dataFinal = new Date(dataFim + 'T00:00:00');
                while (dataCursor <= dataFinal) {
                    let dFim = new Date(dataCursor);
                    dFim.setDate(dataCursor.getDate() + 6);
                    if (dFim > dataFinal) dFim = dataFinal;
                    const sIni = dataCursor.toISOString().split('T')[0];
                    const sFim = dFim.toISOString().split('T')[0];
                    console.log(`📅 Período: ${sIni} até ${sFim}`);
                    await this.processarViewBulk(token, pool, 'vw.V_11A027_Dia', 'Dias_Marcacao', 'Data_Marcacao', sIni, sFim);
                    await this.processarViewBulk(token, pool, 'vw.V_11A027_Hora_Extra', 'Hora_Extra', 'Data_Marcacao', sIni, sFim);
                    dataCursor.setDate(dataCursor.getDate() + 7);
                    await delay(200); 
                }
            }
            console.log("\n✅ [SYNC RH] Finalizado nos DOIS servidores!");
        } catch (err) { console.error("🚨 Erro Crítico:", err.message); }
    },

    async processarViewBulk(token, pool, viewNome, tabelaDestino, colData, ini, fim) {
        const tempTableName = `##Sync_${tabelaDestino}_${Math.floor(Math.random() * 100000)}`;
        try {
            const pWhere = `Codigo_Empresa IN (${configAPI.empresasString}) AND ${colData} >= '${ini}' AND ${colData} <= '${fim}'`;
            const resp = await axios.get(`${configAPI.viewUrl}?pWhere=${encodeURIComponent(pWhere)}&pNome=${viewNome}`, { 
                headers: { 'Authorization': "Bearer " + token }, timeout: 600000 
            });
            let lista = Array.isArray(resp.data) ? resp.data : (resp.data[Object.keys(resp.data).find(k => Array.isArray(resp.data[k]))] || []);
            if (lista.length === 0) return;

            const colunas = Object.keys(lista[0]);
            const table = new sql.Table(tempTableName);
            colunas.forEach(col => table.columns.add(col, sql.NVarChar(sql.MAX), { nullable: true }));
            lista.forEach(item => table.rows.add(...colunas.map(col => item[col] === null ? null : String(item[col]).trim())));

            const request = pool.request();
            await request.query(`CREATE TABLE ${tempTableName} (${colunas.map(c => `[${c}] NVARCHAR(MAX)`).join(', ')})`);
            await request.bulk(table);
            
            const mergeSql = this.getFinalMergeQuery(tabelaDestino, tempTableName, colunas);
            await request.query(mergeSql);
            
            await request.query(`IF OBJECT_ID('tempdb..${tempTableName}') IS NOT NULL DROP TABLE ${tempTableName}`);
            process.stdout.write(`.`);
        } catch (err) { console.error(`\n🚨 Erro em ${tabelaDestino}: ${err.message}`); }
    },

    getFinalMergeQuery(tabela, sourceTable, colunas) {
        const regCol = colunas.find(c => c === 'Codigo_Registro' || c === 'Registro');
        let match = `target.Codigo_Empresa = source.Codigo_Empresa AND target.${regCol} = source.${regCol}`;
        if (tabela !== 'Cadastro_trabalhador') match += ` AND target.Data_Marcacao = source.Data_Marcacao`;
        if (tabela === 'Hora_Extra') match += ` AND target.Tipo = source.Tipo`;

        const updateCols = colunas.filter(c => !['Codigo_Empresa', 'Codigo_Registro', 'Registro', 'Data_Marcacao', 'Tipo'].includes(c));
        
        // 1=1 garante que ele SEMPRE atualize se encontrar a matrícula (resolve o caso do Adauto)
        return `MERGE ${tabela} AS target USING ${sourceTable} AS source ON (${match})
                WHEN MATCHED THEN UPDATE SET ${updateCols.map(c => `target.[${c}] = source.[${c}]`).join(', ')}
                WHEN NOT MATCHED THEN INSERT (${colunas.map(c => `[${c}]`).join(', ')}) VALUES (${colunas.map(c => `source.[${c}]`).join(', ')});`;
    }
};

module.exports = rhSyncService;