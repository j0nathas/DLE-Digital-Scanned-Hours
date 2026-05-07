const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const app = express();
app.use(cors());
const dbConfig = {
    user: 'jonave10',
    password: 'Mellon@2025',
    server: 'OBRMSDLE01',
    database: 'andon',
    options: { encrypt: false, trustServerCertificate: true }
};
app.get('/api/dados/:ano', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().input('ano', req.params.ano).query(`
            SELECT m.*, p.DESCRICAO, maq.NOME_DA_MAQUINA 
            FROM Movimentacao m 
            LEFT JOIN Paradas p ON m.CODMOV = p.CODIGO 
            LEFT JOIN Maquinas maq ON m.MAQUINA = maq.ID_MAQUINA 
            WHERE YEAR(m.DATAI) = @ano
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.listen(5000, () => console.log("Backend SQL em http://localhost:5000"));