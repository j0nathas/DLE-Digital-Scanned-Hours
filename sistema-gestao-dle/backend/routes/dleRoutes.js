const express = require('express');
const router = express.Router();
const { sql, getPoolPromiseAcessos } = require('../config/db');

router.get('/dados', async (req, res) => {
    const { start, end } = req.query;

    if (!start || !end) {
        return res.status(400).json({ error: 'Parâmetros start e end são obrigatórios' });
    }

    try {
        const pool = await getPoolPromiseAcessos();

        // Converte para Date, mas garante formato YYYY-MM-DD
        const startDate = start;
        const endDate = end;

        const result = await pool.request()
            .input('s', sql.VarChar, startDate)
            .input('e', sql.VarChar, endDate)
            .query(`
                SELECT *
                FROM Calculo_DLE.dbo.DLE_CALCULADO
                WHERE Data BETWEEN @s AND @e
                ORDER BY Data, Empresa, CentroCustoAgrupado, CentroCustoOriginal
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Erro rota DLE:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
