const { sql, poolPromiseMlb } = require('../config/db'); 

exports.getMaquinasByPlanta = async (req, res) => {
    try {
        const { planta } = req.params; 
        const pool = await poolPromiseMlb();
        
        const result = await pool.request()
            .input('planta', sql.NVarChar, planta.toUpperCase())
            .query('SELECT SETOR, MAQUINA FROM dbo.maquinas_setores WHERE PLANTA = @planta ORDER BY SETOR, MAQUINA');

        
        const setoresAgrupados = result.recordset.reduce((acc, item) => {
            const { SETOR, MAQUINA } = item;
            if (!acc[SETOR]) {
                acc[SETOR] = []; 
            }
            acc[SETOR].push(MAQUINA); 
            return acc;
        }, {});

        
        const respostaFormatada = Object.keys(setoresAgrupados).map(setorNome => ({
            nome: setorNome,
            maquinas: setoresAgrupados[setorNome]
        }));

        res.status(200).json(respostaFormatada);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};