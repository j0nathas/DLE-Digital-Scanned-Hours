const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { autenticarAD, buscarEmailAD } = require('../config/ad');
const { enviarEmailRecuperacao } = require('../services/emailService');
const { getPoolPromiseAcessos } = require('../config/db');
const sql = require('mssql');

async function getAcessosPool() {
  return getPoolPromiseAcessos('MLB');
}

async function gravarLog(login, planta, ip, sucesso, mensagem = '') {
  try {
    const pool = await getAcessosPool();
    await pool.request()
      .input('login',    sql.VarChar(100), login || '')
      .input('planta',   sql.VarChar(10),  planta || '')
      .input('ip',       sql.VarChar(50),  ip || '')
      .input('sucesso',  sql.Bit,          sucesso ? 1 : 0)
      .input('mensagem', sql.VarChar(300), (mensagem || '').substring(0, 300))
      .query(`
        INSERT INTO dle_log_acessos (login, planta, ip, sucesso, mensagem)
        VALUES (@login, @planta, @ip, @sucesso, @mensagem)
      `);
  } catch (err) {
    console.error('[LOG] Falha ao gravar log:', err.message);
  }
}

async function login(req, res) {
  const { login, senha, planta, adminOnly } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

  if (!login || !senha || !planta) {
    return res.status(400).json({ erro: 'Login, senha e planta são obrigatórios' });
  }

  // --- BYPASS DE DESENVOLVIMENTO ---
  if (String(process.env.DEV_MODE).toLowerCase() === 'true') {
    if (login !== process.env.DEV_USER || senha !== process.env.DEV_SENHA) {
      await gravarLog(login, planta, ip, false, 'Falha no modo desenvolvimento');
      return res.status(401).json({ erro: 'Credenciais de desenvolvimento inválidas' });
    }

    const payload = {
      id: 0,
      login: login,
      nome: login,
      email: `${login}@magna.global`,
      planta: planta.toUpperCase(),
      nomePlanta: { MLB: 'MLB - São Bernardo', MJN: 'MJN - Jarinu', MMB: 'MMB - Vinhedo' }[planta.toUpperCase()] || planta,
      perfil: 'admin',
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    await gravarLog(login, planta, ip, true, 'Login via modo desenvolvimento');
    return res.json({ token, usuario: payload });
  }

  try {
    // 1. Autentica no AD
    const adUser = await autenticarAD(login.trim(), senha, planta.toUpperCase());
    
    if (!adUser) {
        throw new Error('Usuário não retornado pelo diretório');
    }

    // 2. Busca perfil no banco
    const pool = await getAcessosPool();
    const result = await pool.request()
      .input('login', sql.VarChar(100), login.trim().toLowerCase())
      .query(`
        SELECT u.id, u.login, u.nome, u.email, u.planta, u.ativo,
               p.nome AS perfil, p.id AS perfil_id
        FROM dle_usuarios u
        INNER JOIN dle_perfis p ON u.perfil_id = p.id
        WHERE LOWER(u.login) = @login
      `);

    if (result.recordset.length === 0) {
      await gravarLog(login, planta, ip, false, 'Usuário sem acesso ao sistema DLE');
      return res.status(403).json({ erro: 'Usuário autenticado no AD, mas sem acesso ao Sistema DLE.' });
    }

    const usuario = result.recordset[0];
    if (!usuario.ativo) return res.status(403).json({ erro: 'Usuário desativado.' });

    // --- VALIDAÇÃO DE ACESSO ADMINISTRATIVO ---
    if (adminOnly && usuario.perfil !== 'admin') {
      await gravarLog(login, planta, ip, false, 'Tentativa de acesso administrativo negada');
      return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta área.' });
    }

    // 3. Atualiza dados
    await pool.request()
      .input('id',    sql.Int,         usuario.id)
      .input('nome',  sql.VarChar(200), adUser.displayName)
      .input('email', sql.VarChar(200), adUser.mail)
      .query(`UPDATE dle_usuarios SET ultimo_acesso = GETDATE(), nome = @nome, email = @email WHERE id = @id`);

    const payload = {
      id: usuario.id,
      login: usuario.login,
      nome: adUser.displayName,
      email: adUser.mail,
      planta: usuario.planta,
      nomePlanta: adUser.nomePlanta,
      perfil: usuario.perfil,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    await gravarLog(login, planta, ip, true, 'Login OK');
    res.json({ token, usuario: payload });

  } catch (err) {
    await gravarLog(login, planta, ip, false, err.message);
    res.status(401).json({ erro: err.message });
  }
}

async function solicitarReset(req, res) {
    res.json({ mensagem: 'A redefinição de senha deve ser feita através do portal de TI da Magna (Active Directory).' });
}

async function resetarSenha(req, res) {
    res.json({ mensagem: 'A redefinição de senha deve ser feita através do portal de TI da Magna (Active Directory).' });
}

async function verificar(req, res) {
    res.json({ usuario: req.user });
}

async function logout(req, res) {
    res.json({ mensagem: 'Logout realizado com sucesso' });
}

module.exports = { 
    login, 
    solicitarReset, 
    resetarSenha, 
    verificar, 
    logout 
};