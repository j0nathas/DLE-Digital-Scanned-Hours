const { sql, poolPromiseAcessos, poolPromiseControlId, poolPromiseEGA } = require('../config/db');


const contagemEGAController = {

    async buscarContagemEGA(req, res) {
        try {
            const { maquina } = req.params;
            const pool = await poolPromiseEGA;
            const result = await pool.request()
                .input('maquina', sql.VarChar, maquina)
                .query(`
                SELECT TOP (1) 
                maq.NOME_DA_MAQUINA AS maquina,
                mov.PESSOAS AS quantidade_apontada
                FROM [PCPMOV].[dbo].[MOVIMENTACAO] mov
                JOIN MAQUINAS maq ON maq.MAQUINA = mov.MAQUINA
                WHERE TIPO_MOV in ('F', '*') AND
                maq.NOME_DA_MAQUINA = @maquina
                ORDER BY DATAI desc, HORAI desc
                `);
            const contagem = result.recordset[0];
            res.json(contagem);
        } catch (err) {
            console.error('Erro ao buscar contagem EGA:', err);
            res.status(500).json({ error: 'Erro ao buscar contagem EGA' });
        }

    },

    async buscarEsperadoEGA(req, res) {
        try {
            const { maquina } = req.params;
            const pool = await poolPromiseEGA;
            const result = await pool.request()
                .input('maquina', sql.VarChar, maquina)
                .query(`
                SELECT TOP (1) 
                maq.NOME_DA_MAQUINA AS maquina,
                op.PESSOAS AS quantidade_esperada
                FROM [PCPMOV].[dbo].[MOVIMENTACAO] mov
                JOIN OPERADOR op ON op.CODIGO = mov.OPERADOR
                JOIN MAQUINAS maq ON maq.MAQUINA = mov.MAQUINA
                WHERE TIPO_MOV in ('F', '*') and
                maq.NOME_DA_MAQUINA = @maquina
                ORDER BY DATAI desc, HORAI desc
                `);
            const contagem = result.recordset[0];
            res.json(contagem);
        } catch (err) {
            console.error('Erro ao buscar contagem EGA:', err);
            res.status(500).json({ error: 'Erro ao buscar contagem EGA' });
        }

    }

}

module.exports = contagemEGAController;

