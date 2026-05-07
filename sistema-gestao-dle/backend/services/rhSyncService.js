const axios = require('axios');
const sql = require('mssql');
const { getPoolPromiseRH } = require('../config/db');

const configAPI = {
    tokenUrl: "https://gmagna.dtm.com.br/mobileapi/token",
    viewUrl: "https://gmagna.dtm.com.br/mobileapi/api/v1.0/Integracao/View",
    codigoApp: "eypVIn+4BVDmYUwcyaGP/v86aWyFqL0w5EpWTlJNEFGPPUGcUlYosBkc4WAj14teutwMYa+EnfNVo5rPJmdqLA==",
    usuario: "Integração",
    senha: "Integração",
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

    const resp = await axios.post(configAPI.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return resp.data.access_token;
}

const rhSyncService = {
    async sync(dataInicio, dataFim) {
        console.log(`[SYNC RH] 🚀 Iniciando Sincronização Otimizada (Empresas: ${configAPI.empresasArray.join(', ')})`);
        
        try {
            const token = await getAccessToken();
            const pool = await getPoolPromiseRH('MLB');

            // 1. TRABALHADORES
            console.log("\n👤 Sincronizando Cadastro de Trabalhadores...");
            await this.processarViewBulk(token, pool, 'vw.V_11A027_Trabalhador', 'Cadastro_trabalhador', 'Data_Admissao', '2000-01-01', dataFim);

            // 2. LANÇAMENTOS DIÁRIOS E HE (Loop Semanal)
            let dataCursor = new Date(dataInicio + 'T00:00:00');
            const dataFinal = new Date(dataFim + 'T00:00:00');

            while (dataCursor <= dataFinal) {
                let dFim = new Date(dataCursor);
                dFim.setDate(dataCursor.getDate() + 6);
                if (dFim > dataFinal) dFim = dataFinal;

                const sIni = dataCursor.toISOString().split('T')[0];
                const sFim = dFim.toISOString().split('T')[0];

                console.log(`\n📅 Período: ${sIni} até ${sFim}`);
                
                await this.processarViewBulk(token, pool, 'vw.V_11A027_Dia', 'Dias_Marcacao', 'Data_Marcacao', sIni, sFim);
                await this.processarViewBulk(token, pool, 'vw.V_11A027_Hora_Extra', 'Hora_Extra', 'Data_Marcacao', sIni, sFim);
                
                dataCursor.setDate(dataCursor.getDate() + 7);
                await delay(300); 
            }

            console.log("\n✅ [SYNC RH] Sincronização Global Finalizada!");

        } catch (err) { 
            console.error("🚨 Erro Crítico no Sync RH:", err.message); 
        }
    },

    async processarViewBulk(token, pool, viewNome, tabelaDestino, colData, ini, fim) {
        // Nome ÚNICO e GLOBAL (##) para a tabela temporária
        const tempTableName = `##Sync_${tabelaDestino}_${Math.floor(Math.random() * 100000)}`;
        
        try {
            const pWhere = `Codigo_Empresa IN (${configAPI.empresasString}) AND ${colData} >= '${ini}' AND ${colData} <= '${fim}'`;
            const url = `${configAPI.viewUrl}?pWhere=${encodeURIComponent(pWhere)}&pNome=${viewNome}`;
            
            const resp = await axios.get(url, { 
                headers: { 'Authorization': "Bearer " + token },
                timeout: 600000
            });

            let rawData = resp.data;
            let lista = Array.isArray(rawData) ? rawData : [];
            if(!Array.isArray(rawData) && rawData) {
                const key = Object.keys(rawData).find(k => Array.isArray(rawData[k]));
                if(key) lista = rawData[key];
            }

            if (lista.length === 0) {
                console.log(`      - ${tabelaDestino}: Nenhum registro.`);
                return;
            }

            const colunas = Object.keys(lista[0]);
            const resumo = configAPI.empresasArray.map(emp => {
                const count = lista.filter(item => String(item.Codigo_Empresa).trim() === emp).length;
                return count > 0 ? `${emp}: ${count}` : null;
            }).filter(Boolean).join(' | ');

            console.log(`      - ${tabelaDestino}: ${lista.length} linhas recebidas (${resumo})`);
            process.stdout.write(`        💾 Sincronizando... `);

            // 1. Criar estrutura para o Bulk Insert (Tudo como NVARCHAR para evitar erros de conversão no stream)
            const table = new sql.Table(tempTableName);
            colunas.forEach(col => {
                table.columns.add(col, sql.NVarChar(sql.MAX), { nullable: true });
            });

            lista.forEach(item => {
                table.rows.add(...colunas.map(col => {
                    const val = item[col];
                    return (val === null || val === undefined) ? null : String(val);
                }));
            });

            // 2. Executar no Banco usando a mesma conexão para garantir visibilidade
            const request = pool.request();
            
            // Criar a tabela temporária GLOBAL física
            const createSql = `CREATE TABLE ${tempTableName} (${colunas.map(c => `[${c}] NVARCHAR(MAX)`).join(', ')})`;
            await request.query(createSql);

            // Inserir os dados em massa
            await request.bulk(table);

            // Executar o MERGE
            const mergeSql = this.getFinalMergeQuery(tabelaDestino, tempTableName, colunas);
            await request.query(mergeSql);

            // Limpar a tabela temporária
            await request.query(`IF OBJECT_ID('tempdb..${tempTableName}') IS NOT NULL DROP TABLE ${tempTableName}`);

            console.log("OK");

        } catch (err) {
            console.log("❌");
            console.error(`        🚨 ERRO EM ${tabelaDestino}: ${err.message}`);
            // Tenta limpar a tabela em caso de erro
            try { await pool.request().query(`IF OBJECT_ID('tempdb..${tempTableName}') IS NOT NULL DROP TABLE ${tempTableName}`); } catch (e) {}
        }
    },

    getFinalMergeQuery(tabela, sourceTable, colunas) {
        const regCol = colunas.find(c => c === 'Codigo_Registro' || c === 'Registro');
        let match = "";
        
        if (tabela === 'Cadastro_trabalhador') {
            match = `target.Codigo_Empresa = source.Codigo_Empresa AND target.Codigo_Registro = source.Codigo_Registro`;
        } else if (tabela === 'Dias_Marcacao') {
            match = `target.Codigo_Empresa = source.Codigo_Empresa AND target.${regCol} = source.${regCol} AND target.Data_Marcacao = source.Data_Marcacao`;
        } else if (tabela === 'Hora_Extra') {
            match = `target.Codigo_Empresa = source.Codigo_Empresa AND target.${regCol} = source.${regCol} AND target.Data_Marcacao = source.Data_Marcacao AND target.Tipo = source.Tipo`;
        }

        const keys = ['Codigo_Empresa', 'Codigo_Registro', 'Registro', 'Data_Marcacao', 'Tipo'];
        const updateCols = colunas.filter(c => !keys.includes(c));

        const updateSet = updateCols.map(c => `target.[${c}] = source.[${c}]`).join(', ');
        
        // Compara as primeiras colunas para ver se houve mudança real
        const checkDiff = updateCols.slice(0, 5).map(c => 
            `ISNULL(CAST(target.[${c}] AS NVARCHAR(MAX)), '') <> ISNULL(CAST(source.[${c}] AS NVARCHAR(MAX)), '')`
        ).join(' OR ');

        return `
            MERGE ${tabela} AS target
            USING ${sourceTable} AS source
            ON (${match})
            WHEN MATCHED AND (${checkDiff || '1=1'}) THEN 
                UPDATE SET ${updateSet}
            WHEN NOT MATCHED THEN 
                INSERT (${colunas.map(c => `[${c}]`).join(', ')}) 
                VALUES (${colunas.map(c => `source.[${c}]`).join(', ')});
        `;
    }
};

module.exports = rhSyncService;