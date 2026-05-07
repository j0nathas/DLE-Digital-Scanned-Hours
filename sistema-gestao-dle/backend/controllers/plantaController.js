const { getPoolPromiseCadastros } = require('../config/db');

const plantaController = {
    /**
     * Busca a lista de todas as plantas cadastradas no banco de dados (MLB, MMB, MJN).
     * Utiliza a conexão de Cadastros da MLB como ponto de partida para essa listagem global.
     */
    getAllPlantas: async (req, res) => {
        try {
            // Busca as plantas usando a configuração da MLB como padrão para o pool de cadastros
            const pool = await getPoolPromiseCadastros('MLB'); 
            
            const result = await pool.request().query(`
                SELECT 
                    descricao AS sigla, 
                    'Planta ' + descricao AS nome 
                FROM dbo.Planta
            `);

            res.json(result.recordset);

        } catch (err) {
            console.error('🚨 ERRO AO BUSCAR LISTA DE PLANTAS:', err.message);
            res.status(500).json({ 
                erro: 'Falha interna no servidor ao listar as plantas cadastradas.', 
                detalhe: err.message 
            });
        }
    }
};

module.exports = plantaController;