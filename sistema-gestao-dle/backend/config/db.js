const sql = require('mssql');
const oracledb = require('oracledb');
require('dotenv').config();

const plantConfigs = {
    // Configuração EGA padronizada com o seu .env
    EGA: {
        user: process.env.USERDB,
        password: process.env.PASSDB,
        server: process.env.SRVDB,
        database: process.env.DBNAME,
        instanceName: process.env.INSTANCENAME
    },
    MLB: {
        acessos: { user: process.env.MLB_ACESSOS_USER, password: process.env.MLB_ACESSOS_PASSWORD, server: process.env.MLB_ACESSOS_SERVER, database: process.env.MLB_ACESSOS_DATABASE },
        cadastros: { user: process.env.MLB_CAD_USER, password: process.env.MLB_CAD_PASSWORD, server: process.env.MLB_CAD_SERVER, database: process.env.MLB_CAD_DATABASE },
        dlerh: { user: process.env.RH_REP_USER, password: process.env.RH_REP_PASS, server: process.env.RH_REP_SERVER, database: 'dlerh' }
    },
    MLB_REP: { user: process.env.RH_REP_USER, password: process.env.RH_REP_PASS, server: process.env.RH_REP_SERVER, database: 'dlerh' },
    MLB_DLE: { user: process.env.RH_DLE_USER, password: process.env.RH_DLE_PASS, server: process.env.RH_DLE_SERVER, database: 'dlerh' },
    MMB: {
        acessos: { user: process.env.MMB_ACESSOS_USER, password: process.env.MMB_ACESSOS_PASSWORD, server: process.env.MMB_ACESSOS_SERVER, database: process.env.MMB_ACESSOS_DATABASE },
        cadastros: { user: process.env.MMB_CAD_USER, password: process.env.MMB_CAD_PASSWORD, server: process.env.MMB_CAD_SERVER, database: process.env.MMB_CAD_DATABASE }
    },
    MJN: {
        acessos: { user: process.env.MJN_CAD_USER, password: process.env.MJN_CAD_PASSWORD, server: process.env.MLB_ACESSOS_SERVER, database: 'acessos' },
        cadastros: { user: process.env.MJN_CAD_USER, password: process.env.MJN_CAD_PASSWORD, server: process.env.MJN_CAD_SERVER, database: process.env.MJN_CAD_DATABASE }
    },
    BI: { user: process.env.BI_USER, password: process.env.BI_PASSWORD, server: process.env.BI_SERVER, database: process.env.BI_DATABASE },
    ORACLE: { user: process.env.ORACLE_USER, password: process.env.ORACLE_PASSWORD, connectString: process.env.ORACLE_CONNECTION_STRING }
};

const connectionPools = new Map();

async function getPool(poolName, config) {
    if (!config || !config.server || !config.user) {
        throw new Error(`Configuração incompleta para ${poolName}. Verifique o .env`);
    }

    if (connectionPools.has(poolName)) {
        const pool = connectionPools.get(poolName);
        if (pool.connected) return pool;
        connectionPools.delete(poolName);
    }

    const sqlConfig = {
        ...config,
        options: { 
            encrypt: false, 
            trustServerCertificate: true, 
            enableArithAbort: true,
            // Prioriza o instanceName do config, senão tenta extrair da string do server
            instanceName: config.instanceName || (config.server.includes('\\') ? config.server.split('\\')[1] : undefined)
        },
        connectionTimeout: 30000, 
        requestTimeout: 60000,
        pool: { max: 15, min: 0, idleTimeoutMillis: 30000 }
    };

    // Remove a barra invertida do server para não duplicar a instância na conexão
    if (sqlConfig.server.includes('\\')) sqlConfig.server = sqlConfig.server.split('\\')[0];
    
    console.log(`[DB] Conectando Pool: ${poolName} -> ${sqlConfig.server}${sqlConfig.options.instanceName ? '\\' + sqlConfig.options.instanceName : ''}`);

    try {
        const pool = new sql.ConnectionPool(sqlConfig);
        await pool.connect();
        connectionPools.set(poolName, pool);
        return pool;
    } catch (err) {
        console.error(`[DB] Erro ao conectar no pool ${poolName}:`, err.message);
        throw err;
    }
}

module.exports = {
    sql, 
    oracledb,
    // Exportações padronizadas
    getPoolPromiseEGA: () => getPool('EGA_PCPMASTER', plantConfigs.EGA),
    
    getPoolPromiseAcessos: (sigla) => getPool(`acessos_${sigla.toUpperCase()}`, plantConfigs[sigla.toUpperCase()].acessos),
    getPoolPromiseCadastros: (sigla) => getPool(`cadastros_${sigla.toUpperCase()}`, plantConfigs[sigla.toUpperCase()].cadastros),
    getPoolPromiseRH: (sigla) => {
        const s = sigla.toUpperCase();
        const config = plantConfigs[s] || plantConfigs[s]?.dlerh;
        return getPool(`rh_${s}`, config?.user ? config : plantConfigs[s]?.dlerh);
    },
    getPoolPromiseBI: () => getPool('BI_RHEMA', plantConfigs.BI),
    getOracleConfig: () => plantConfigs.ORACLE
};