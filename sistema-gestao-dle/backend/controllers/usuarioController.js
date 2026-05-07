const { getPoolPromiseAcessos } = require('../config/db');
const sql = require('mssql');

async function getPerfis(req, res) {
    try {
        const pool = await getPoolPromiseAcessos('MLB');
        const result = await pool.request().query("SELECT id, nome FROM dle_perfis");
        res.json(result.recordset);
    } catch (err) { 
        res.status(500).json({ erro: err.message }); 
    }
}

async function autorizarUsuario(req, res) {
    const { login, planta, perfil_id } = req.body;
    try {
        const pool = await getPoolPromiseAcessos('MLB');
        await pool.request()
            .input('login', sql.VarChar, login.trim().toLowerCase())
            .input('planta', sql.VarChar, planta)
            .input('pid', sql.Int, perfil_id)
            .query(`
                IF EXISTS (SELECT 1 FROM dle_usuarios WHERE login = @login)
                BEGIN
                    UPDATE dle_usuarios SET planta=@planta, perfil_id=@pid, ativo=1 WHERE login=@login
                END
                ELSE
                BEGIN
                    INSERT INTO dle_usuarios (login, nome, email, planta, perfil_id, ativo)
                    VALUES (@login, @login, @login+'@magna.com', @planta, @pid, 1)
                END
            `);
        res.json({ mensagem: 'Acesso liberado com sucesso!' });
    } catch (err) { 
        res.status(500).json({ erro: err.message }); 
    }
}

module.exports = { getPerfis, autorizarUsuario };