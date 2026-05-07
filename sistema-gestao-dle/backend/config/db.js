const sql = require('mssql');
const oracledb = require('oracledb');
require('dotenv').config();

const plantConfigs = {
    MLB: {
        acessos: { user: process.env.MLB_ACESSOS_USER, password: process.env.MLB_ACESSOS_PASSWORD, server: process.env.MLB_ACESSOS_SERVER, database: process.env.MLB_ACESSOS_DATABASE },
        cadastros: { user: process.env.MLB_CAD_USER, password: process.env.MLB_CAD_PASSWORD, server: process.env.MLB_CAD_SERVER, database: process.env.MLB_CAD_DATABASE },
        dlerh: { user: process.env.MLB_RH_USER, password: process.env.MLB_RH_PASSWORD, server: process.env.MLB_RH_SERVER, database: process.env.MLB_RH_DATABASE }
    },
    MMB: {
        acessos: { user: process.env.MMB_ACESSOS_USER, password: process.env.MMB_ACESSOS_PASSWORD, server: process.env.MMB_ACESSOS_SERVER, database: process.env.MMB_ACESSOS_DATABASE },
        cadastros: { user: process.env.MMB_CAD_USER, password: process.env.MMB_CAD_PASSWORD, server: process.env.MMB_CAD_SERVER, database: process.env.MMB_CAD_DATABASE }
    },
    MJN: {
        acessos: { user: process.env.MJN_CAD_USER, password: process.env.MJN_CAD_PASSWORD, server: process.env.MJN_CAD_SERVER, database: process.env.MJN_ACESSOS_DATABASE },
        cadastros: { user: process.env.MJN_CAD_USER, password: process.env.MJN_CAD_PASSWORD, server: process.env.MJN_CAD_SERVER, database: process.env.MJN_CAD_DATABASE }
    },
    BI: { user: process.env.BI_USER, password: process.env.BI_PASSWORD, server: process.env.BI_SERVER, database: process.env.BI_DATABASE },
    ORACLE: { user: process.env.ORACLE_USER, password: process.env.ORACLE_PASSWORD, connectString: process.env.ORACLE_CONNECTION_STRING }
};

const connectionPools = new Map();

async function getPool(poolName, config) {
    if (!config || !config.server) throw new Error(`Configuração incompleta para ${poolName}.`);

    if (connectionPools.has(poolName)) {
        const pool = connectionPools.get(poolName);
        if (pool.connected) return pool;
        connectionPools.delete(poolName);
    }

    // Configuração Reforçada
    const sqlConfig = {
        ...config,
        options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            // Força o cancelamento de instâncias caso o servidor seja padrão (Resolve o problema do SINCRODOC fantasma)
            instanceName: config.server.includes('\\') ? config.server.split('\\')[1] : undefined
        },
        connectionTimeout: 30000, // Aumentado para 30s
        requestTimeout: 60000,    // Aumentado para 60s
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
    };

    // Ajusta o server se tiver barra invertida
    if (sqlConfig.server.includes('\\')) {
        sqlConfig.server = sqlConfig.server.split('\\')[0];
    }

    console.log(`[DB] Criando Pool: ${poolName} -> Server: ${sqlConfig.server} | DB: ${sqlConfig.database}`);

    const pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    connectionPools.set(poolName, pool);
    return pool;
}

module.exports = {
    sql,
    oracledb,
    getPoolPromiseAcessos: (sigla) => getPool(`acessos_${sigla.toUpperCase()}`, plantConfigs[sigla.toUpperCase()].acessos),
    getPoolPromiseCadastros: (sigla) => getPool(`cadastros_${sigla.toUpperCase()}`, plantConfigs[sigla.toUpperCase()].cadastros),
    getPoolPromiseRH: (sigla) => getPool(`rh_${sigla.toUpperCase()}`, plantConfigs[sigla.toUpperCase()].dlerh || plantConfigs[sigla.toUpperCase()].cadastros),
    getPoolPromiseBI: () => getPool('BI_RHEMA', plantConfigs.BI),
    getOracleConfig: () => plantConfigs.ORACLE,
};