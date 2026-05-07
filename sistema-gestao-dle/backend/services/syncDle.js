const { sql, getPoolPromiseAcessos } = require('../config/db');
const financeiroController = require('../controllers/financeiroController');
const rhController = require('../controllers/rhController');
const indicadorController = require('../controllers/indicadorController');
const debxController = require('../controllers/debxController');
const { enriquecerComHierarquia } = require('../utils/enriquecerHierarquia');

const syncDleService = {
    /**
     * Função auxiliar para capturar o retorno JSON dos controllers existentes,
     * simulando uma requisição HTTP interna para aproveitar a lógica já escrita.
     */
    async capturar(controllerFn, params) {
        let resultado = null;
        const req = { query: params };
        const res = { 
            json: (data) => { resultado = data; return res; }, 
            status: () => res 
        };
        await controllerFn(req, res);
        return resultado;
    },

    /**
     * Função principal que fatia o período solicitado em blocos de 7 dias
     * para garantir estabilidade e evitar timeouts nas APIs e no Banco.
     */
    async sincronizarTudo(startDate, endDate) {
        console.log(`[DLE SYNC] 🔄 Iniciando: ${startDate} a ${endDate}`);
        let dataCursor = new Date(startDate + 'T00:00:00');
        const dataFinal = new Date(endDate + 'T00:00:00');

        while (dataCursor <= dataFinal) {
            let dFim = new Date(dataCursor);
            dFim.setDate(dataCursor.getDate() + 6); // Fatias de 7 dias
            if (dFim > dataFinal) dFim = dataFinal;

            const sIni = dataCursor.toISOString().split('T')[0];
            const sFim = dFim.toISOString().split('T')[0];

            await this.processarBloco(sIni, sFim);
            dataCursor.setDate(dataCursor.getDate() + 7);
        }
        console.log(`✅ [DLE SYNC] Sincronização do período ${startDate} a ${endDate} finalizada!`);
    },

    /**
     * Processa um bloco específico de datas, realizando a coleta,
     * normalização e gravação em massa (Bulk) no SQL Server.
     */
    async processarBloco(sIni, sFim) {
        const tempTableName = `##TempDLE_${Math.floor(Math.random() * 100000)}`;
        const amostrasExibidas = new Set();

        try {
            console.log(`   📅 Bloco Semanal: ${sIni} até ${sFim}`);
            const params = { startDate: sIni, endDate: sFim, start: sIni, end: sFim, nivel: 'setor' };

            // Busca os dados de todas as fontes simultaneamente para performance
            const [dadosRH, dadosMMB, dadosOracle, resFabrica] = await Promise.all([
                this.capturar(rhController.getIndicadoresRH, params),
                this.capturar(financeiroController.getIndicadoresFinanceiro, params),
                this.capturar(debxController.getMergeAll, params),
                this.capturar(indicadorController.getIndicadoresFabrica, params)
            ]);

            const dadosFabrica = resFabrica?.listaDetalhada || [];
            const mapa = {};

            const registrar = (item, tipo, valor) => {
                const h = enriquecerComHierarquia(item);
                
                // Normalização Forçada: UpperCase e Trim para evitar duplicatas por grafia/espaços
                let p = (h.planta === 'OUTROS' ? (item.Planta || item.PlantaSigla || 'MLB') : h.planta).toUpperCase().trim();
                let sAgru = ((h.centroCusto === 'NÃO MAPEADO' || h.centroCusto === 'NÃO PRODUTIVO') ? 
                             (item.SetorOriginal || item.Setor || item.Desc_C_Custo || 'NÃO MAPEADO') : h.centroCusto).toUpperCase().trim();
                let sOrig = (item.SetorOriginal || item.Setor || item.Desc_C_Custo || item.NomeOriginalSetor || sAgru).toUpperCase().trim();

                const d = item.DataRef || item.Data;
                if (!d) return;
                const dStr = new Date(d).toISOString().split('T')[0];
                
                const chave = `${p}_${sAgru}_${dStr}`;

                if (!mapa[chave]) {
                    mapa[chave] = { p, sOrig, sAgru, d: dStr, fin: 0, fab: 0, rh: 0 };
                }
                mapa[chave][tipo] += parseFloat(valor || 0);

                // Log de amostra para auditoria no console (Apenas 1 por tipo/planta por bloco)
                const amostraChave = `${tipo}_${p}`;
                if (!amostrasExibidas.has(amostraChave)) {
                    console.log(`      [AMOSTRA] ${tipo.toUpperCase()} (${p}): ${sAgru} = ${valor.toFixed(2)}h`);
                    amostrasExibidas.add(amostraChave);
                }
            };

            // Distribuindo dados no mapa de consolidação
            if (dadosRH) dadosRH.forEach(i => registrar(i, 'rh', i.TotalHoras));
            if (dadosMMB) dadosMMB.forEach(i => registrar(i, 'fin', i["HH GERADA"]));
            if (dadosOracle) dadosOracle.forEach(i => registrar(i, 'fin', i["HH GERADA"]));
            if (dadosFabrica) dadosFabrica.forEach(i => registrar(i, 'fab', (i.DuracaoSegundos / 3600)));

            const listaFinal = Object.values(mapa);
            if (listaFinal.length === 0) return;

            // Configuração do Bulk Insert no SQL Server
            const pool = await getPoolPromiseAcessos('MLB');
            const table = new sql.Table(tempTableName);
            table.columns.add('Empresa', sql.NVarChar(50), { nullable: true });
            table.columns.add('CentroCustoOriginal', sql.NVarChar(200), { nullable: true });
            table.columns.add('CentroCustoAgrupado', sql.NVarChar(200), { nullable: true });
            table.columns.add('Data', sql.Date, { nullable: true });
            table.columns.add('ValorFinanceiro', sql.Float, { nullable: true });
            table.columns.add('ValorFabrica', sql.Float, { nullable: true });
            table.columns.add('ValorRH', sql.Float, { nullable: true });

            listaFinal.forEach(row => table.rows.add(row.p, row.sOrig, row.sAgru, row.d, row.fin, row.fab, row.rh));

            const request = pool.request();
            request.timeout = 600000; // 10 minutos para lidar com grandes volumes

            // Execução SQL: Cria Temp -> Bulk Insert -> Merge (com Group By para evitar duplicatas) -> Drop
            await request.query(`CREATE TABLE ${tempTableName} (Empresa NVARCHAR(50), CentroCustoOriginal NVARCHAR(200), CentroCustoAgrupado NVARCHAR(200), Data DATE, ValorFinanceiro FLOAT, ValorFabrica FLOAT, ValorRH FLOAT)`);
            await request.bulk(table);
            
            await request.query(`
                MERGE Calculo_DLE.dbo.DLE_CALCULADO AS target
                USING (
                    SELECT Empresa, CentroCustoAgrupado, Data, 
                           MAX(CentroCustoOriginal) as CentroCustoOriginal,
                           SUM(ValorFinanceiro) as ValorFinanceiro,
                           SUM(ValorFabrica) as ValorFabrica,
                           SUM(ValorRH) as ValorRH
                    FROM ${tempTableName}
                    GROUP BY Empresa, CentroCustoAgrupado, Data
                ) AS source
                ON (target.Empresa = source.Empresa AND target.CentroCustoAgrupado = source.CentroCustoAgrupado AND target.Data = source.Data)
                WHEN MATCHED THEN 
                    UPDATE SET 
                        target.ValorFinanceiro = source.ValorFinanceiro, 
                        target.ValorFabrica = source.ValorFabrica, 
                        target.ValorRH = source.ValorRH, 
                        target.CentroCustoOriginal = source.CentroCustoOriginal
                WHEN NOT MATCHED THEN 
                    INSERT (Empresa, CentroCustoOriginal, CentroCustoAgrupado, Data, ValorFinanceiro, ValorFabrica, ValorRH)
                    VALUES (source.Empresa, source.CentroCustoOriginal, source.CentroCustoAgrupado, source.Data, source.ValorFinanceiro, source.ValorFabrica, source.ValorRH);
                
                DROP TABLE ${tempTableName};
            `);

            console.log(`        💾 Bloco Finalizado: ${listaFinal.length} registros salvos.`);

        } catch (error) {
            console.error(`        🚨 ERRO NO BLOCO DLE: ${error.message}`);
            try {
                const pool = await getPoolPromiseAcessos('MLB');
                await pool.request().query(`IF OBJECT_ID('tempdb..${tempTableName}') IS NOT NULL DROP TABLE ${tempTableName}`);
            } catch (e) {}
        }
    },

    /**
     * Verifica se o ano de 2025 já possui dados na tabela de cálculo.
     * Se estiver vazio, executa a carga histórica semanal automática.
     */
    async verificarEExecutarCargaHistorica() {
        try {
            const pool = await getPoolPromiseAcessos('MLB');
            const check = await pool.request().query(`
                SELECT TOP 1 1 FROM Calculo_DLE.dbo.DLE_CALCULADO WHERE YEAR(Data) = 2025
            `);

            if (check.recordset.length > 0) {
                console.log("ℹ️ [DLE SYNC] Histórico de 2025 já identificado no banco. Pulando carga pesada.");
                return;
            }

            console.log("🚀 [DLE SYNC] Histórico 2025 não encontrado. Iniciando carga completa semanal...");

            // Loop dinâmico para gerar semanas de 2025
            let dataInicio = new Date('2025-01-01T00:00:00');
            const dataFimAno = new Date('2025-12-31T00:00:00');

            while (dataInicio <= dataFimAno) {
                let dFim = new Date(dataInicio);
                dFim.setDate(dataInicio.getDate() + 6);
                if (dFim > dataFimAno) dFim = dataFimAno;

                const sIni = dataInicio.toISOString().split('T')[0];
                const sFim = dFim.toISOString().split('T')[0];

                console.log(`📅 Processando Histórico Semanal 2025: ${sIni} até ${sFim}`);
                await this.processarBloco(sIni, sFim);

                dataInicio.setDate(dataInicio.getDate() + 7);
            }

            console.log("✅ [DLE SYNC] Carga histórica de 2025 finalizada com sucesso!");

        } catch (error) {
            console.error("🚨 Erro ao processar carga histórica 2025:", error.message);
        }
    }
};

module.exports = syncDleService;