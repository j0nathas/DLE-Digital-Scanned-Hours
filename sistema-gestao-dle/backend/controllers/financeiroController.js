const { getPoolPromiseBI, sql } = require('../config/db');

/**
 * Controller responsável pelos indicadores financeiros (Earned Hours) da MMB
 */
const financeiroController = {

    /**
     * Busca os indicadores de HH Gerada do banco de BI (SQL Server)
     * Realiza o agrupamento diretamente no SQL para reduzir o tráfego de rede
     */
    getIndicadoresFinanceiro: async (req, res) => {
        const { startDate, endDate } = req.query;

        // Validação básica de entrada
        if (!startDate || !endDate) {
            return res.status(400).json({
                error: 'Parâmetros startDate e endDate são obrigatórios.'
            });
        }

        try {
            const pool = await getPoolPromiseBI();

            // Query otimizada: Agrupamos no banco para enviar menos linhas ao Node
            const result = await pool.request()
                .input('start', sql.Date, startDate)
                .input('end', sql.Date, endDate)
                .query(`
                    SELECT 
                        'MMB' AS Planta, 
                        [DescricaoCelula] AS Maquina, 
                        [Data], 
                        [Turno], 
                        SUM([NovaHorasCent]) AS HH
                    FROM [dbo].[DLE]
                    WHERE [Data] BETWEEN @start AND @end
                    GROUP BY [DescricaoCelula], [Data], [Turno]
                    ORDER BY [Data] DESC
                `);

            // Mapeamento para o padrão esperado pelo Frontend
            const dados = result.recordset.map(item => ({
                Planta: 'MMB',
                // Normalização do nome da máquina
                Maquina: item.Maquina ? item.Maquina.toString().toUpperCase().trim() : 'GERAL',
                // Formatação da data (YYYY-MM-DD)
                Data: item.Data ? item.Data.toISOString().split('T')[0] : '',
                // Conversão do código numérico de turno para Label
                Turno: item.Turno == 1 ? '1º Turno' : 
                       item.Turno == 2 ? '2º Turno' : 
                       item.Turno == 3 ? '3º Turno' : '0ºTurno',
                'HH GERADA': item.HH || 0
            }));

            // Retorno do JSON otimizado
            res.json(dados);

        } catch (err) {
            console.error('🚨 Erro no Controller Financeiro (DLE MMB):', err.message);
            res.status(500).json({
                error: 'Erro ao consultar o banco de dados de BI.',
                detalhe: err.message
            });
        }
    }
};

module.exports = financeiroController;