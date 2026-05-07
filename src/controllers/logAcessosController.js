// Caminho: src/controllers/logAcessosController.js

const { sql, poolPromiseAcessos } = require('../config/db');

const logAcessosController = {
    getUltimoAcessoTL: async (req, res) => {
        const { linha } = req.query;
        if (!linha) {
            return res.status(400).json({ error: 'O parâmetro "linha" é obrigatório.' });
        }
        
        console.log(`[BACKEND] Validando a presença de TL na linha: ${linha}`);

        try {
            const pool = await poolPromiseAcessos;
            
            // Query AJUSTADA para buscar o último acesso do TL na tabela de LOGS
            const query = `
                SELECT TOP 1 
                    Nome_Colaborador AS Pessoa, 
                    Cargo, 
                    Nome_Dispositivo AS Linha, 
                    Data_Hora_Evento 
                FROM dbo.log_acessos 
                WHERE Cargo = 'TL' 
                  AND Nome_Dispositivo = @Linha 
                  AND CAST(Data_Hora_Evento AS DATE) = CAST(GETDATE() AS DATE) 
                ORDER BY Data_Hora_Evento DESC;
            `;

            const result = await pool.request()
                .input('Linha', sql.VarChar, linha)
                .query(query);

            console.log(`[BACKEND] Resultado da validação de presença:`, result.recordset);

            if (result.recordset.length > 0) {
                // Se encontrou um acesso de TL hoje, retorna sucesso.
                res.status(200).json(result.recordset[0]);
            } else {
                // Se não encontrou, retorna o erro.
                res.status(404).json({ message: 'Nenhum Team Leader foi identificado.' });
            }
        } catch (err) {
            console.error('Erro ao buscar último acesso de TL:', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

//TESTE TEAMLEADER ACESSO************************************

//TESTE TEAMLEADER ACESSO*************************


   simularAcesso: async (req, res) => {
    const { nome, cargo, linha } = req.body;
    if (!nome || !cargo || !linha) {
        return res.status(400).json({ error: 'Nome, cargo e linha são obrigatórios para simulação.' });
    }

    try {
        const pool = await poolPromiseAcessos;
        const request = pool.request();
        
        request.input('Nome_Colaborador', sql.VarChar, nome);
        request.input('Cargo', sql.VarChar, cargo);
        request.input('Nome_Dispositivo', sql.VarChar, linha);

        const idLogOriginalUnico = Math.floor(Date.now() / 1000);

        request.input('ID_Log_Original', sql.Int, idLogOriginalUnico);

        const query = `
            INSERT INTO dbo.log_acessos 
                (ID_Log_Original, Data_Hora_Evento, Descricao_Evento, Nome_Colaborador, Cargo, Nome_Dispositivo)
            VALUES 
                (@ID_Log_Original, GETDATE(), 'Acesso Autorizado (Online)', @Nome_Colaborador, @Cargo, @Nome_Dispositivo)`;
        
        await request.query(query);
        res.status(201).json({ message: `Acesso simulado para ${nome} (${cargo}) com sucesso!` });

    } catch (err) {
        console.error('Erro ao simular acesso:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor.',
            db_error: err.originalError ? err.originalError.message : err.message
        });
    }
},
};

module.exports = logAcessosController;