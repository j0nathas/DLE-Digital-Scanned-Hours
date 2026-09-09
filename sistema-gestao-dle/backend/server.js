require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const oracledb = require('oracledb');

// ===============================================
// ===        IMPORTAÇÃO DOS SERVIÇOS            ===
// ===============================================
const rhSyncService = require('./services/rhSyncService');
const syncDleService = require('./services/syncDle');
const { sql, getPoolPromiseAcessos, getPoolPromiseEGA } = require('./config/db');

// ===============================================
// ===        IMPORTAÇÃO DOS CONTROLLERS         ===
// ===============================================
const indicadorController = require('./controllers/indicadorController');
const plantaController = require('./controllers/plantaController');
const financeiroController = require('./controllers/financeiroController');
const debxController = require('./controllers/debxController');
const rhController = require('./controllers/rhController');
const usuarioController = require('./controllers/usuarioController');
const gestaoController = require('./controllers/gestaoController');

// ===============================================
// ===        ROTAS MODULARES                    ===
// ===============================================
const debxRoutes = require('./routes/debx'); 
const dleRoutes = require('./routes/dleRoutes');
const rhRoutes = require('./routes/rh');
const authRoutes = require('./routes/auth');
const usuarioRoutes = require('./routes/usuarioRoutes');
const gestaoRoutes = require('./routes/gestaoRoutes');
const { autenticado } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ===============================================
// ===    CONFIGURAÇÃO ORACLE (DEBX)            ===
// ===============================================
const oracleDbConfig = {
    user:          process.env.ORACLE_USER,
    password:      process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING
};

// ===============================================
// ===        BLOCO DE DIAGNÓSTICO             ===
// ===============================================
console.log('--- [CHECK] Verificando integridade dos Controllers ---');
const check = (name, obj, func) => {
    if (!obj || !obj[func]) {
        console.error(` ❌ ERRO: Função '${func}' não encontrada no ${name}`);
        return (req, res) => res.status(500).json({ error: `Função ${func} ausente no servidor.` });
    }
    console.log(` ✅ ${name}.${func}: OK`);
    return obj[func];
};

const getFabrica             = check('indicadorController',  indicadorController,  'getIndicadoresFabrica');
const getFin                 = check('financeiroController', financeiroController, 'getIndicadoresFinanceiro');
const getValidarMLB          = check('indicadorController',  indicadorController,  'validarDadosMLB');
const getValidarMJN          = check('indicadorController',  indicadorController,  'validarDadosMJN');
const getValidarMMB          = check('indicadorController',  indicadorController,  'validarDadosMMB');

// Funções unificadas no GestaoController
const getOperadoresDetalhado = check('gestaoController',      gestaoController,      'getOperadoresDetalhado');
const getContagemEGA         = check('gestaoController',      gestaoController,      'getContagemEGA');
const getContagemCards       = check('gestaoController',      gestaoController,      'getContagemCards');

console.log('-------------------------------------------------------');

// ─── DIAGNÓSTICO AD (LDAP) ───
app.get('/api/debug/ad-test', async (req, res) => {
    const ldap = require('ldapjs');
    const resultados = [];

    const testar = (label, url, userDN, pass, baseDN) => {
        return new Promise((resolve) => {
            const client = ldap.createClient({ url, timeout: 5000, connectTimeout: 8000 });
            client.on('error', (err) => {
                resultados.push({ label, status: 'ERRO_CONEXAO', detalhe: err.message });
                resolve();
            });
            client.bind(userDN, pass, (err) => {
                if (err) {
                    resultados.push({ label, status: 'BIND_FALHOU', userDN, detalhe: err.message });
                } else {
                    resultados.push({ label, status: 'BIND_OK', userDN });
                    client.search(baseDN, {
                        filter: '(sAMAccountName=jonave10)',
                        scope: 'sub',
                        attributes: ['displayName', 'mail', 'sAMAccountName', 'memberOf']
                    }, (sErr, sRes) => {
                        const entries = [];
                        if (sErr) { resultados.push({ label: label + '_SEARCH', status: 'ERRO', detalhe: sErr.message }); }
                        else {
                            sRes.on('searchEntry', e => entries.push(e.object));
                            sRes.on('end', () => resultados.push({ label: label + '_SEARCH', status: 'OK', entries }));
                            sRes.on('error', e => resultados.push({ label: label + '_SEARCH', status: 'ERRO', detalhe: e.message }));
                        }
                    });
                }
                setTimeout(() => { client.unbind(); resolve(); }, 3000);
            });
        });
    };

    await testar('OBR_service_account', process.env.AD_URL, process.env.AD_SA_OBR_USER, process.env.AD_SA_OBR_PASS, process.env.AD_OU_OBR);
    await testar('OBR_com_dominio', process.env.AD_URL, process.env.AD_SA_OBR_USER + '@' + process.env.AD_DOMAIN, process.env.AD_SA_OBR_PASS, process.env.AD_OU_OBR);
    await testar('MMB_service_account', process.env.AD_URL, process.env.AD_SA_MMB_USER, process.env.AD_SA_MMB_PASS, process.env.AD_OU_MMB);

    res.json({ resultados, env: {
        AD_URL: process.env.AD_URL,
        AD_DOMAIN: process.env.AD_DOMAIN,
        AD_SA_OBR_USER: process.env.AD_SA_OBR_USER,
        AD_OU_OBR: process.env.AD_OU_OBR
    }});
});

// ===============================================
// ===             ROTAS DA API                 ===
// ===============================================

// Autenticação e Usuários
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', autenticado, usuarioRoutes);

// Módulos principais
app.use('/api/dle',      dleRoutes);
app.use('/api/producao', debxRoutes); 
app.use('/api/rh',       rhRoutes);
app.use('/api/gestao',   gestaoRoutes);

// Rotas diretas e Indicadores
app.get('/api/indicadores/fabrica',              getFabrica);
app.get('/api/indicadores/operadores-detalhado',   getOperadoresDetalhado);
app.get('/api/financeiro/indicadores',           getFin);
app.get('/api/validar/mlb',                      getValidarMLB);
app.get('/api/validar/mjn',                      getValidarMJN);
app.get('/api/validar/mmb',                      getValidarMMB);

// Rotas de Planta e Apontamentos unificadas no GestaoController
app.get('/api/planta/maquinas/:plantaSigla',     gestaoController.getMaquinasLayout);
app.get('/api/planta/operadores/:plantaSigla',   gestaoController.getContagemCards);
app.get('/api/plantas/listar',                   plantaController.getAllPlantas);
app.get('/api/apontamentos/dle/:plantaSigla',    gestaoController.getApontamentosPorPeriodoDLE);

// Rota específica para contagem EGA
app.get('/api/contagem-ega',                     getContagemEGA);

// Sincronização manual DLE
app.post('/api/dle/sync', async (req, res) => {
    const { start, end } = req.body;
    try {
        await syncDleService.sincronizarTudo(start, end);
        res.json({ message: 'Sincronização iniciada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===============================================
// ===        FRONTEND (ESTÁTICOS)              ===
// ===============================================
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

const debxStaticPath = path.join(__dirname, '../integrações_Debx');
app.use('/debx-assets', express.static(debxStaticPath));

app.get('/relatorio-rf', (req, res) => {
    res.sendFile(path.join(debxStaticPath, 'html', 'relatorio_R_F.html'));
});

// Fallback para SPA (index.html)
app.get(/.*/, (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Endpoint não encontrado' });
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ===============================================
// ===       LÓGICA DE SINCRONIZAÇÃO            ===
// ===============================================
async function executarSincronizacaoAutomatica() {
    const hoje = new Date().toISOString().split('T')[0];
    const dataInicioObj = new Date();
    dataInicioObj.setDate(dataInicioObj.getDate() - 7);
    const inicio = dataInicioObj.toISOString().split('T')[0];

    console.log(`[SYNC] 🕒 Iniciando atualização: ${inicio} até ${hoje}`);
    try {
        await rhSyncService.sync(inicio, hoje);
        await syncDleService.sincronizarTudo(inicio, hoje);
        console.log(`[SYNC] ✅ Sincronização concluída com sucesso.`);
    } catch (error) {
        console.error(`[SYNC ERR] Falha na sincronização:`, error.message);
    }
}

cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Rodando atualização horária...');
    await executarSincronizacaoAutomatica();
});

// ===============================================
// ===             STARTUP                      ===
// ===============================================
async function startup() {
    try {
        console.log('--------------------------------------------------');
        console.log('[STARTUP] Conectando aos bancos SQL Server...');
        for (const p of ['MLB', 'MMB', 'MJN']) {
            await getPoolPromiseAcessos(p);
        }
        
        console.log('[STARTUP] Conectando ao Banco EGA...');
        await getPoolPromiseEGA();
        
        console.log('[STARTUP] Conexões SQL Server OK.');

        console.log('[STARTUP] Testando conexão Oracle (Debx)...');
        const testConn = await oracledb.getConnection(oracleDbConfig);
        await testConn.close();
        console.log('[STARTUP] Conexão Oracle OK.');

        console.log('[STARTUP] Sincronizando dados dos últimos 7 dias...');
        await executarSincronizacaoAutomatica();
        
        console.log('[STARTUP] Sistema pronto e atualizado.');
        console.log('--------------------------------------------------');
    } catch (e) {
        console.error('[STARTUP ERR] Erro crítico na inicialização:', e.message);
    }
}

// Chamar o startup ANTES de ouvir a porta
startup();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend DLE rodando na porta ${PORT}`);
});