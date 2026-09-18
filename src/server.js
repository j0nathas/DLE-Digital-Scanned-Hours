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
