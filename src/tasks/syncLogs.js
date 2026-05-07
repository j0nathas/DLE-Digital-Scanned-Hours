const cron = require('node-cron');
const { poolPromiseAcessos } = require('../config/db'); // Apenas o pool de acessos é necessário para inserir
 
const runSync = async () => {
    console.log('[Sync MLB por IP] Executando tarefa de sincronização da planta MLB...');
 
    // Script T-SQL otimizado para rodar diretamente
    const syncQueryMLB_por_IP = `
        BEGIN TRY
            DECLARE @LinhasSincronizadas INT;
            INSERT INTO acessos.dbo.log_acessos (
                ID_Log_Original, Data_Hora_Evento, Data_Cadastro_Usuario, Descricao_Evento,
                Nome_Colaborador, Matricula, Cargo, Nome_Dispositivo, Nome_Area, IP_Dispositivo
            )
            SELECT DISTINCT -- <<< ADICIONADO DISTINCT PARA EVITAR DUPLICATAS GERADAS PELO JOIN
                L.id AS ID_Log_Original, L.time AS Data_Hora_Evento, U.timeOfRegistration AS Data_Cadastro_Usuario,
                CASE L.event
                    WHEN 1 THEN 'Acesso Negado'
                    WHEN 7 THEN 'Acesso Autorizado (Online)'
                    ELSE 'Evento (' + CAST(L.event AS VARCHAR(10)) + ')'
                END AS Descricao_Evento,
                L.userName AS Nome_Colaborador, U.registration AS Matricula, U.cargo AS Cargo,
                L.deviceName AS Nome_Dispositivo, L.area AS Nome_Area, D.host AS IP_Dispositivo
            FROM
                controlid.dbo.Logs AS L
            INNER JOIN
                controlid.dbo.Devices AS D ON L.idDevice = D.id
            INNER JOIN
                cadastros_mlb.dbo.Linha_Maquinas AS MLB_LM ON D.host = MLB_LM.IP_Dispositivo
            LEFT JOIN
                controlid.dbo.Users AS U ON L.idUser = U.id
            WHERE
                NOT EXISTS (
                    SELECT 1
                    FROM acessos.dbo.log_acessos AS LAE
                    WHERE LAE.ID_Log_Original = L.id
                );
            SET @LinhasSincronizadas = @@ROWCOUNT;
            IF @LinhasSincronizadas > 0
            BEGIN
                -- Imprime apenas se houver novas linhas, para não poluir o log
                PRINT CONVERT(VARCHAR, GETDATE(), 120) + ' [Sync MLB por IP] Sincronização concluída. ' + CAST(@LinhasSincronizadas AS VARCHAR) + ' novo(s) log(s) inserido(s).';
            END
        END TRY
        BEGIN CATCH
            PRINT 'ERRO durante a sincronização da MLB por IP: ' + ERROR_MESSAGE();
        END CATCH
    `;
 
    try {
        const pool = await poolPromiseAcessos;
        // Adiciona um listener para o evento 'infoMessage' para capturar as mensagens PRINT do SQL
        const request = pool.request();
        request.on('info', (info) => {
            console.log(info.message);
        });
        const result = await request.query(syncQueryMLB_por_IP);
 
 
    } catch (err) {
        console.error('[Sync MLB] Erro CRÍTICO durante a sincronização da MLB:', err.message);
    }
};
 
cron.schedule('*/30 * * * * *', runSync);
 
console.log('Tarefa de sincronização da MLB (por IP) agendada para rodar a cada 30 segundos.');