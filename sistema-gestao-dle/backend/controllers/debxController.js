const { oracledb, getOracleConfig } = require('../config/db');

const MAPA_TURNO = {
    0: 'S/T',
    1: '1º Turno',
    2: '2º Turno',
    3: '3º Turno'
};

/**
 * Função Auxiliar para Consultas de Produção Unificadas (MLB e MJN)
 * Busca dados de produção (Kardex) cruzando com cadastro de produto e rotina.
 */
async function executarConsultaMerge(schema, startDate, endDate, labelPlanta) {
    let connection;
    try {
        const config = getOracleConfig();
        connection = await oracledb.getConnection(config);

        const queryKardex = `
                SELECT
                    K.KAR_CODPRO             AS PROD,
                    P.PRO_DESCRI             AS DESC_PROD,
                    P.PRO_GRPROD             AS GRPROD,
                    K.KAR_DATMOV             AS DATA,
                    K.KAR_QTDMOV             AS QTD,
                    NVL(O.COF_ROTEIR, 1)     AS ROT,
                    K.KAR_CODTUR             AS CODTUR,
                    NVL(R.ROT_PROHOR, 1)     AS PROHOR,
                    NVL(R.ROT_N_OPER, 1)     AS N_OPER,
                    M.MAQ_CODIGO             AS MAQUINA,
                    M.MAQ_DESCRI             AS DESC_MAQUINA
                FROM ${schema}.F_KARDEX K
                INNER JOIN ${schema}.F_PRODS P ON P.PRO_CODPRO = K.KAR_CODPRO
                LEFT JOIN ${schema}.F_OF O ON O.COF_CODIOF = K.KAR_NUMDOC
                LEFT JOIN ${schema}.F_ROTINA R 
                    ON TRIM(R.ROT_CODPRO) = TRIM(K.KAR_CODPRO)
                    AND (R.ROT_ROTEIR = O.COF_ROTEIR OR R.ROT_ROTEIR = 1)
                LEFT JOIN ${schema}.F_MAQUINA M ON M.MAQ_CODIGO = R.ROT_CODMAQ
                WHERE K.KAR_DATMOV BETWEEN TO_DATE(:sd, 'YYYY-MM-DD') AND TO_DATE(:ed, 'YYYY-MM-DD')
                AND K.KAR_TIPMOV = 'EAC'
            `;

        const kardexRes = await connection.execute(
            queryKardex,
            { sd: startDate, ed: endDate },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return kardexRes.rows.map(row => {
            // Conversão de valores para cálculo preciso
            const nroPessoas = Math.max(parseFloat(row.N_OPER || 1), 1);
            const pecasHora  = Math.max(parseFloat(row.PROHOR || 1), 0.0001);
            const hhCalculada = (row.QTD / pecasHora) * nroPessoas;

            return {
                Planta:        labelPlanta,
                Data:          row.DATA,
                Turno:         MAPA_TURNO[row.CODTUR] || 'S/T',
                Produto:       String(row.PROD || '').trim(),
                Descricao:     row.DESC_PROD || row.DESC_MAQUINA || '',
                Roteiro:       row.ROT || '1',
                Quantidade:    row.QTD,
                prodHora:      pecasHora,  
                nroOperadores: nroPessoas, 
                'HH GERADA':   hhCalculada,
                Maquina:       row.MAQUINA,
                Desc_Maquina:  row.DESC_MAQUINA,
                Setor:         row.DESC_MAQUINA || 'PRODUÇÃO',
                Grupo:         row.GRPROD || 'SEM GRUPO'
            };
        });

    } catch (err) {
        console.error(`❌ Erro executarConsultaMerge [${schema}]:`, err.message);
        return [];
    } finally {
        if (connection) await connection.close();
    }
}

const debxController = {

    /**
     * Retorna os dados de refugo e faturamento para os dashboards analíticos
     */
    getRefugo: async (req, res) => {
        let connection;
        const { start, end } = req.query;
        try {
            connection = await oracledb.getConnection(getOracleConfig());
            const query = `
                SELECT * FROM (
                    SELECT PRODUTO_FINAL AS "Prod.Final", VDESCRI AS "Desc.Prod.Final", VUNIMED AS "UN.F",
                    PRT_NEGOCIO AS "Negocio", PRT_TIPOPRO AS "Tipo Prod.", PRT_PROJETO AS "Projeto",
                    DATREF AS "Data", CODTUR AS "Tur.", CODMAQ AS "Maquina", CODPRO AS "Material",
                    PRO_DESCRI AS "Desc. Material", PRO_UNIMED AS "Un.M.", CODIOF AS "O.F.",
                    IND AS "IND", MOTREF AS "Ref.", TBL_DESCRI AS "Motivo Refugo", REFTOT AS "Qtde Ref.",
                    (REFTOT * NVL(CUSFINAL, PRMEDI)) AS "Valor Ref."
                    FROM olsa.ALJ_V_PROD_TOPICOS, 
                    (SELECT DATREF, CODTUR, CODMAQ, CODPRO, PRO_DESCRI, PRO_UNIMED, CODIOF, CUSFINAL,
                        PRO_PRMEDI PRMEDI, NVL(PRO_COMP09, PRO_CODPRO) PRODUTO_FINAL, SUBSTR(INDICE, 1, 3) IND,
                        MOTREF, TBL_DESCRI, SUM(QTDREF) REFTOT
                    FROM olsa.F_TABELAS, olsa.F_PRODS,
                    (SELECT RFG_DT_RFG DATREF, RFG_CODPRO CODPRO, RFG_QT_RFG QTDREF, RFG_CODREF MOTREF,
                        'REF' || LPAD(TO_CHAR(RFG_CODIGO), 6, '0') INDICE, RFG_CODIGO CODIGO, RFG_CODIOF CODIOF,
                        ROF_CODMAQ CODMAQ, RFG_CODTUR CODTUR FROM olsa.F_ROTOF, olsa.F_REFUGO WHERE ROF_CODIOF = RFG_CODIOF AND ROF_CODSEQ = RFG_CODSEQ
                    UNION ALL
                    SELECT OFS_DTLANC DATREF, OFS_CODPRO CODPRO, OFS_QTDPRO QTDREF, OFS_CODMOT MOTREF,
                        'OFS' || TO_CHAR(OFS_CODIGO) INDICE, TO_CHAR(OFS_CODIGO) CODIGO, OFS_CODIOF CODIOF,
                        ROF_CODMAQ CODMAQ, OFS_CODTUR CODTUR FROM olsa.F_ROTOF, olsa.F_OFSUCATA WHERE ROF_CODIOF(+) = OFS_CODIOF AND ROF_CODSEQ(+) = OFS_CODSEQ
                    UNION ALL
                    SELECT SUC_DATSUC DATREF, SUC_CODPRO CODPRO, SUC_QTDPRO QTDREF, SUC_MOTIVO MOTREF,
                        'SUC' || TO_CHAR(SUC_CODIGO) INDICE, TO_CHAR(SUC_CODIGO) CODIGO, NULL CODIOF, 'SUCATA' CODMAQ, SUC_CODTUR CODTUR FROM olsa.F_SUCATA
                    UNION ALL
                    SELECT KAR_DATMOV DATREF, KAR_CODPRO CODPRO, KAR_QTDMOV * -1 QTDREF, 100 MOTREF,
                        KAR_INDICE CODIGO, KAR_CODIGO CODIGO, NULL CODIOF, 'RETRABALHO' CODMAQ, KAR_CODTUR CODTUR
                    FROM olsa.F_KARDEX WHERE SUBSTR(KAR_INDICE, 1, 3) IN ('DEV','ASG','SUC', 'REF', 'OFS','RCO','RFG') AND KAR_TIPMOV = 'DM'),
                    (SELECT DCI_ANOMES, DCI_CODPRO, SUM(DCI_VLRCUS) CUSFINAL FROM olsa.F_DETCUSINT WHERE SUBSTR(DCI_CODPRO, 1, 3) <> 'SUC' GROUP BY DCI_ANOMES, DCI_CODPRO)
                    WHERE DATREF BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')
                    AND TBL_CODTAB(+) = MOTREF AND PRO_CODPRO = CODPRO AND DCI_CODPRO(+) = CODPRO
                    AND DCI_ANOMES(+) = TO_CHAR(ADD_MONTHS(DATREF, -1), 'YYYYMM')
                    GROUP BY DATREF, CODTUR, CODMAQ, CODPRO, PRO_DESCRI, PRO_UNIMED, PRO_PRMEDI, NVL(PRO_COMP09, PRO_CODPRO), MOTREF, TBL_DESCRI, CUSFINAL, SUBSTR(INDICE, 1, 3), CODIOF)
                    WHERE VCODPRO = PRODUTO_FINAL)
            `;
            const result = await connection.execute(query, { startDate: start, endDate: end }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            res.json(result.rows);
        } catch (err) {
            console.error('❌ Erro Refugo:', err.message);
            res.status(500).json({ error: err.message });
        } finally {
            if (connection) await connection.close();
        }
    },

    /**
     * Unifica a produção de todas as plantas em uma única rota para o painel financeiro
     */
    getMergeAll: async (req, res) => {
        const { start, end } = req.query;
        try {
            const dataMLB = await executarConsultaMerge('olsa',         start, end, 'MLB');
            const dataMJN = await executarConsultaMerge('MAGNA_JARINU', start, end, 'MJN');

            console.log(`[DEBX] API respondendo com ${dataMLB.length + dataMJN.length} registros totais.`);
            
            res.json([...dataMLB, ...dataMJN]);
        } catch (err) {
            console.error('❌ Erro Merge Global:', err.message);
            res.status(500).json({ error: err.message });
        }
    },

    /**
     * Diagnosticador de colunas do F_KARDEX
     */
    getColunasFKardex: async (req, res) => {
        let connection;
        const schema = (req.query.schema || 'OLSA').toUpperCase();
        try {
            connection = await oracledb.getConnection(getOracleConfig());
            const result = await connection.execute(
                `SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'F_KARDEX' AND OWNER = :schema ORDER BY COLUMN_ID`,
                { schema },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        } finally {
            if (connection) await connection.close();
        }
    },

    /**
     * Auxiliar para identificar configurações de turnos
     */
    getTabelaTurnos: async (req, res) => {
        let connection;
        const schema = (req.query.schema || 'OLSA').toUpperCase();
        try {
            connection = await oracledb.getConnection(getOracleConfig());
            const turnoRes = await connection.execute(
                `SELECT * FROM ${schema}.F_TURNO`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            res.json(turnoRes.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        } finally {
            if (connection) await connection.close();
        }
    }
};

module.exports = debxController;