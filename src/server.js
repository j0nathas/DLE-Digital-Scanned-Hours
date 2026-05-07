// ARQUIVO: src/server.js
// VERSÃO FINAL ORGANIZADA E CORRIGIDA

const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const ejsLayouts = require('express-ejs-layouts');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// =========================================================
// === INICIALIZAÇÃO DA APLICAÇÃO EXPRESS ==================
// =========================================================
const app = express();
const PORT = process.env.PORT || 3000;

// INICIALIZAÇÃO DE MÓDULOS E BANCO DE DADOS
require('./config/db');
require('./tasks/syncLogs');

// IMPORTAÇÕES DE ROTAS
const produtosRoutes = require('./routes/produtosRoutes');
const accessRulesRoutes = require('./routes/accessRulesRoutes');
const adFieldsRoutes = require('./routes/adFieldsRoutes');
const alarmLogsRoutes = require('./routes/alarmLogsRoutes');
const areaAccessRulesRoutes = require('./routes/areaAccessRulesRoutes');
const areasRoutes = require('./routes/areasRoutes');
const cardsRoutes = require('./routes/cardsRoutes');
const changeLogsRoutes = require('./routes/changeLogsRoutes');
const configFieldsRoutes = require('./routes/configFieldsRoutes');
const configFieldsValuesRoutes = require('./routes/configFieldsValuesRoutes');
const configNamesValuesRoutes = require('./routes/configNamesValuesRoutes');
const controlVersionRoutes = require('./routes/controlVersionRoutes');
const creditAreasRoutes = require('./routes/creditAreasRoutes');
const creditsRoutes = require('./routes/creditsRoutes');
const creditTypeAccessRulesRoutes = require('./routes/creditTypeAccessRulesRoutes');
const creditTypesRoutes = require('./routes/creditTypesRoutes');
const creditTypeUsersRoutes = require('./routes/creditTypeUsersRoutes');
const deviceAccessRulesRoutes = require('./routes/deviceAccessRulesRoutes');
const deviceRelaysRoutes = require('./routes/deviceRelaysRoutes');
const deviceRelaysFloorplansRoutes = require('./routes/deviceRelaysFloorplansRoutes');
const devicesRoutes = require('./routes/devicesRoutes');
const emailAccessRoutes = require('./routes/emailAccessRoutes');
const emailAlarmRoutes = require('./routes/emailAlarmRoutes');
const emailRulesRoutes = require('./routes/emailRulesRoutes');
const floorplansRoutes = require('./routes/floorplansRoutes');
const groupAccessRulesRoutes = require('./routes/groupAccessRulesRoutes');
const groupIdentificationRulesRoutes = require('./routes/groupIdentificationRulesRoutes');
const groupsRoutes = require('./routes/groupsRoutes');
const groupTypesRoutes = require('./routes/groupTypesRoutes');
const identificationModesRoutes = require('./routes/identificationModesRoutes');
const identificationRulesRoutes = require('./routes/identificationRulesRoutes');
const importUsersRoutes = require('./routes/importUsersRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const integrationDevicesRoutes = require('./routes/integrationDevicesRoutes');
const loginAttemptLogsRoutes = require('./routes/loginAttemptLogsRoutes');
const logMessagesRoutes = require('./routes/logMessagesRoutes');
const logsRoutes = require('./routes/logsRoutes');
const modeIdentificationRulesRoutes = require('./routes/modeIdentificationRulesRoutes');
const operatorsRoutes = require('./routes/operatorsRoutes');
const operatorTypeGroupsRoutes = require('./routes/operatorTypeGroupsRoutes');
const operatorTypeModulesRoutes = require('./routes/operatorTypeModulesRoutes');
const operatorTypesRoutes = require('./routes/operatorTypesRoutes');
const parkingAccessRulesRoutes = require('./routes/parkingAccessRulesRoutes');
const parkingsRoutes = require('./routes/parkingsRoutes');
const parkingSpotsRoutes = require('./routes/parkingSpotsRoutes');
const printersRoutes = require('./routes/printersRoutes');
const schedulAccessRulesRoutes = require('./routes/schedulAccessRulesRoutes');
const schedulsRoutes = require('./routes/schedulsRoutes');
const templatesRoutes = require('./routes/templatesRoutes');
const typeAccessRulesRoutes = require('./routes/typeAccessRulesRoutes');
const typeIdentificationRulesRoutes = require('./routes/typeIdentificationRulesRoutes');
const userAccessRulesRoutes = require('./routes/userAccessRulesRoutes');
const userCreditsRoutes = require('./routes/userCreditsRoutes');
const userGroupsRoutes = require('./routes/userGroupsRoutes');
const userIdentificationRulesRoutes = require('./routes/userIdentificationRulesRoutes');
const usersRoutes = require('./routes/usersRoutes');
const userTypesRoutes = require('./routes/userTypesRoutes');
const vehicleAccessRulesRoutes = require('./routes/vehicleAccessRulesRoutes');
const vehicleLocationRoutes = require('./routes/vehicleLocationRoutes');
const vehicleParkingEvsRoutes = require('./routes/vehicleParkingEvsRoutes');
const vehiclesRoutes = require('./routes/vehiclesRoutes');
const logAcessosRoutes = require('./routes/logAcessosRoutes');
const maquinasSetoresRoutes = require('./routes/maquinasSetoresRoutes');

const apontamentoRoutes = require('./routes/apontamentoRoutes');
const gestaoRoutes = require('./routes/gestaoRoutes');

// =========================================================
// === MIDDLEWARES E CONFIGURAÇÕES =========================
// =========================================================
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.static(path.join(__dirname, '..', 'public-MMB')));
app.use(express.static(path.join(__dirname, '..', 'public-JRN')));
app.use('/gestao', express.static(path.join(__dirname, '..', 'gestao', 'public')));

// Configuração da Sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'coloque-uma-frase-secreta-bem-longa-aqui-para-seguranca',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Configuração do EJS e Layouts
app.use(ejsLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'gestao', 'views'));
app.set('layout', 'layout');

// =========================================================
// === USO DAS ROTAS DA API ================================
// =========================================================
app.use('/api/produtos', produtosRoutes);
app.use('/api/accessrules', accessRulesRoutes);
app.use('/api/adfields', adFieldsRoutes);
app.use('/api/alarmlogs', alarmLogsRoutes);
app.use('/api/areaaccessrules', areaAccessRulesRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/changelogs', changeLogsRoutes);
app.use('/api/configfields', configFieldsRoutes);
app.use('/api/configfieldsvalues', configFieldsValuesRoutes);
app.use('/api/confignamesvalues', configNamesValuesRoutes);
app.use('/api/controlversion', controlVersionRoutes);
app.use('/api/creditareas', creditAreasRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/credittypeaccessrules', creditTypeAccessRulesRoutes);
app.use('/api/credittypes', creditTypesRoutes);
app.use('/api/credittypeusers', creditTypeUsersRoutes);
app.use('/api/deviceaccessrules', deviceAccessRulesRoutes);
app.use('/api/devicerelays', deviceRelaysRoutes);
app.use('/api/devicerelaysfloorplans', deviceRelaysFloorplansRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/emailaccess', emailAccessRoutes);
app.use('/api/emailalarm', emailAlarmRoutes);
app.use('/api/emailrules', emailRulesRoutes);
app.use('/api/floorplans', floorplansRoutes);
app.use('/api/groupaccessrules', groupAccessRulesRoutes);
app.use('/api/groupidentificationrules', groupIdentificationRulesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/grouptypes', groupTypesRoutes);
app.use('/api/identificationmodes', identificationModesRoutes);
app.use('/api/identificationrules', identificationRulesRoutes);
app.use('/api/importusers', importUsersRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/integrationdevices', integrationDevicesRoutes);
app.use('/api/loginattemptlogs', loginAttemptLogsRoutes);
app.use('/api/logmessages', logMessagesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/modeidentificationrules', modeIdentificationRulesRoutes);
app.use('/api/operators', operatorsRoutes);
app.use('/api/operatortypegroups', operatorTypeGroupsRoutes);
app.use('/api/operatortypemodules', operatorTypeModulesRoutes);
app.use('/api/operatortypes', operatorTypesRoutes);
app.use('/api/parkingaccessrules', parkingAccessRulesRoutes);
app.use('/api/parkings', parkingsRoutes);
app.use('/api/parkingspots', parkingSpotsRoutes);
app.use('/api/printers', printersRoutes);
app.use('/api/schedulaccessrules', schedulAccessRulesRoutes);
app.use('/api/scheduls', schedulsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/typeaccessrules', typeAccessRulesRoutes);
app.use('/api/typeidentificationrules', typeIdentificationRulesRoutes);
app.use('/api/useraccessrules', userAccessRulesRoutes);
app.use('/api/usercredits', userCreditsRoutes);
app.use('/api/usergroups', userGroupsRoutes);
app.use('/api/useridentificationrules', userIdentificationRulesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/usertypes', userTypesRoutes);
app.use('/api/vehicleaccessrules', vehicleAccessRulesRoutes);
app.use('/api/vehiclelocation', vehicleLocationRoutes);
app.use('/api/vehicleparkingevs', vehicleParkingEvsRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/maquinassetores', maquinasSetoresRoutes);
app.use('/api/logacessos', logAcessosRoutes);
app.use('/api/apontamentos', apontamentoRoutes);
app.use('/api/gestao', gestaoRoutes);

// =========================================================
// === ROTAS DE PÁGINAS HTML (FRONT-END ANTIGO) ============
// =========================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/mlb.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mlb.html')));
app.get('/mmb.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mmb.html')));
app.get('/mjn.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mjn.html')));
app.get('/setor.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'setor.html')));

app.get('/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'telaInicial.html')));

app.get('/Linha 01/telaPrincipal.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'Linha 01', 'telaPrincipal.html')));
app.get('/s.LA01_02_03_04/telaPrincipal.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 's.LA01_02_03_04', 'telaPrincipal.html')));
app.get('/s.LA05_06_07_08/telaPrincipal.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 's.LA05_06_07_08', 'telaPrincipal.html')));
app.get('/s.LA09_010/telaPrincipal.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 's.LA09_010', 'telaPrincipal.html')));

app.get('/Small/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'Small', 'telaInicial.html')));
app.get('/Small/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'Small_2', 'telaInicial.html')));
app.get('/Small/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'Small_3', 'telaInicial.html')));

app.get('/Metalização/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'Metalizacao', 'telaInicial.html')));

app.get('/Injecao/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'Injecao', 'telaInicial.html')));
app.get('/injecao_small/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'injecao_small', 'telaInicial.html')));

app.get('/Injetora-mdl/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public-JRN', 'injecao-mjn', 'telaInicial.html')));
app.get('/Linha-1/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public-JRN', 'Linha-1', 'telaInicial.html')));
app.get('/j.FA01_j.FA02/telaInicial.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public-JRN', 'j.FA01_j.FA02', 'html', 'telaInicial.html')));
app.get('/J.FA01_02_03_04/telaPrincipal.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public-JRN', 'J.FA01_02_03_04', 'html', 'telaInicial.html')));
app.get('/J.FA01_02_03_04/telaPrincipal.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public-JRN', 'J.LA01_02_03_04', 'html', 'telaInicial.html')));
app.get('/j.FA01vw_j.FA02vw/telaPrincipal.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public-JRN', 'j.FA01_j.FA02', 'html', 'telaPrincipal.html')));

// =========================================================
// === ROTAS DE PÁGINAS DE GESTÃO (EJS) ====================
// =========================================================
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/gestao/login');
    }
    next();
};

// --- Páginas Públicas de Gestão ---
app.get('/gestao/login', (req, res) => {
    res.render('login', { layout: false });
});
app.get('/gestao/register', (req, res) => { res.render('register', { layout: false }); });
app.get('/gestao/forgot-password', (req, res) => { res.render('forgot-password', { layout: false }); });
app.get('/gestao/reset-password', (req, res) => { res.render('reset-password', { token: req.query.token, layout: false }); });

// --- Páginas Protegidas de Gestão ---
app.get('/gestao/selecao', requireLogin, (req, res) => {
    res.render('selecao', {
        title: 'Seleção de Unidades',
        userName: req.session.userName,
        userCargo: req.session.userCargo,
        plantaId: null
    });
});
app.get('/gestao/gestao-maquinas', requireLogin, (req, res) => {
    res.render('gestao-maquinas', {
        title: 'Gestão de Máquinas',
        plantaId: req.query.planta,
        userName: req.session.userName,
        userCargo: req.session.userCargo // << CONFIRME QUE ESTA LINHA EXISTE
    });
});

app.get('/gestao/indicadores', requireLogin, (req, res) => {
    res.render('indicadores', {
        title: 'Dashboard de Indicadores',
        title: 'Dashboard de Indicadores',
        userName: req.session.userName,
        userCargo: req.session.userCargo,
        plantaId: req.query.planta
    });
});
app.get('/gestao/dashboard-tempo', requireLogin, (req, res) => {
    res.render('tempo-dashboard', {
        title: 'Dashboard de Tempo',
        userName: req.session.userName,
        userCargo: req.session.userCargo,
        plantaId: req.query.planta
    });
});

// =========================================================
// === INICIALIZAÇÃO DO SERVIDOR ===========================
// =========================================================

const os = require('os');

const networkInterfaces = os.networkInterfaces();
let localIP = 'localhost';
for (const iface of Object.values(networkInterfaces)) {
    for (const config of iface) {
        if (config.family === 'IPv4' && !config.internal) {
            localIP = config.address;
            break;
        }
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando e acessível na rede em http://${localIP}:${PORT}`);
    console.log(`Sistema de Gestão: http://${localIP}:${PORT}/gestao/login`);
});
