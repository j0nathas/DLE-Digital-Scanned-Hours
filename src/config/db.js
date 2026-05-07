const sql = require('mssql');
// A linha 'require('dotenv').config()' não é necessária aqui, pois será carregada no server.js

// Função auxiliar para criar uma configuração específica
const createConfig = (prefix) => {
    // Se o prefixo for 'DB', usa as variáveis padrão. Senão, usa as prefixadas.
    const user = process.env[`${prefix}_USER`] || process.env.DB_USER;
    const password = process.env[`${prefix}_PASSWORD`] || process.env.DB_PASSWORD;
    const server = process.env[`${prefix}_SERVER`] || process.env.DB_SERVER;
    const database = process.env[`${prefix}_DATABASE`];

    if (!database) {
        console.error(`[DB Config] Nome do banco de dados para o prefixo '${prefix}' não definido no .env`);
        return null;
    }

    return {
        user,
        password,
        server,
        database,
        options: {
            encrypt: false,
            trustServerCertificate: true
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    };
};

// Função para criar e conectar um pool
const createPool = async (config, poolName) => {
    if (!config) return null;
    try {
        const pool = await new sql.ConnectionPool(config).connect();
        console.log(`Conectado ao banco de dados: ${config.database} (Pool: ${poolName})`);
        return pool;
    } catch (err) {
        console.error(`Falha na conexão com ${config.database}:`, err);
        throw err;
    }
};

// Cria uma configuração para cada banco de dados
const configAcessos = createConfig('ACESSOS_DB');
const configMlb = createConfig('MLB_DB');
const configControlId = createConfig('DB'); // Usa as variáveis padrão

// Cria e exporta uma promessa para cada pool de conexão
const poolPromiseAcessos = createPool(configAcessos, 'Acessos');
const poolPromiseMlb = createPool(configMlb, 'MLB');
const poolPromiseControlId = createPool(configControlId, 'ControlID');

module.exports = {
    sql,
    poolPromiseAcessos,
    poolPromiseMlb,
    poolPromiseControlId
};