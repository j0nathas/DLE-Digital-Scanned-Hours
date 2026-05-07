// ARQUIVO: src/controllers/gestaoController.js
// VERSÃO FINAL COMPLETA E ORGANIZADA

const { sql, poolPromiseAcessos } = require('../config/db');
const bcrypt = require('bcrypt');

// Função auxiliar para formatar o tempo
const formatarSegundos = (totalSegundos) => {
    if (isNaN(totalSegundos) || totalSegundos === null || totalSegundos < 0) {
        return '00:00:00';
    }
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = Math.floor(totalSegundos % 60);
    return [horas, minutos, segundos].map(v => v.toString().padStart(2, '0')).join(':');
};

// =============================================================
// === FUNÇÕES DE AUTENTICAÇÃO =================================
// =============================================================

exports.login = async (req, res) => {
    const { login, senha } = req.body;
    if (!login || !senha) { return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' }); }
    try {
        const pool = await poolPromiseAcessos;
        const userResult = await pool.request().input('Login', sql.VarChar, login).query("SELECT * FROM dbo.Usuarios_Gestao WHERE Login = @Login");
        if (userResult.recordset.length === 0) { return res.status(401).json({ message: 'Usuário ou senha inválidos.' }); }
        const user = userResult.recordset[0];
        const senhaValida = await bcrypt.compare(senha, user.Senha_Hash);
        if (!senhaValida) { return res.status(401).json({ message: 'Usuário ou senha inválidos.' }); }
        req.session.userId = user.ID;
        req.session.userName = user.Nome;
        req.session.userCargo = user.Cargo; // Salva o cargo na sessão
        res.status(200).json({ message: 'Login realizado com sucesso!' });
    } catch (error) {
        console.error("Erro no processo de login:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.register = async (req, res) => {
    res.status(501).json({ message: 'Não implementado' });
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) { return res.status(500).json({ message: "Não foi possível fazer logout." }); }
        res.status(200).json({ message: "Logout realizado com sucesso." });
    });
};

exports.forgotPassword = async (req, res) => {
    res.status(501).json({ message: 'Não implementado' });
};

exports.resetPassword = async (req, res) => {
    res.status(501).json({ message: 'Não implementado' });
};


exports.getDashboardData = async (req, res) => {
    try {
        const { data, local } = req.query;
        if (!data) {
            return res.status(400).json({ message: "O parâmetro 'data' é obrigatório." });
        }
        const pool = await poolPromiseAcessos;
        const request = pool.request();
        request.input('data', sql.Date, data);
        let localFilterClause = '';
        if (local) {
            localFilterClause = "AND Nome_Area = @local";
            request.input('local', sql.VarChar, local);
        }
        const query = `
            WITH PairedEvents AS (
                SELECT Nome_Colaborador, Nome_Area, Data_Hora_Evento AS HoraEntrada,
                       LEAD(Data_Hora_Evento, 1) OVER (PARTITION BY Nome_Colaborador, Nome_Area, CAST(Data_Hora_Evento AS DATE) ORDER BY Data_Hora_Evento) AS HoraSaida
                FROM [acessos].[dbo].[vw_log_acessos]
                WHERE CAST(Data_Hora_Evento AS DATE) = @data AND Nome_Colaborador IS NOT NULL AND Nome_Area IS NOT NULL ${localFilterClause}
            )
            SELECT Nome_Colaborador AS Colaborador, Nome_Area AS Areas, HoraEntrada AS PassagemCracha, HoraSaida AS HoraPosterior,
                   DATEDIFF(second, HoraEntrada, HoraSaida) AS DuracaoSegundos
            FROM PairedEvents WHERE HoraSaida IS NOT NULL AND DATEDIFF(second, HoraEntrada, HoraSaida) > 0;
        `;
        const result = await request.query(query);
        const dadosFormatados = result.recordset.map(item => ({
            Colaborador: item.Colaborador, Áreas: item.Areas,
            PassagemCracha: item.PassagemCracha ? item.PassagemCracha.toISOString().substr(11, 8) : 'N/A',
            HoraPosterior: item.HoraPosterior ? item.HoraPosterior.toISOString().substr(11, 8) : 'N/A',
            Subtração: formatarSegundos(item.DuracaoSegundos), HoraDecimal: (item.DuracaoSegundos || 0) / 3600
        }));
        res.status(200).json(dadosFormatados);
    } catch (error) {
        console.error("ERRO DETALHADO NO BACKEND (Dados Diários):", error);
        res.status(500).json({ message: "Erro interno do servidor ao buscar dados do dashboard." });
    }
};

exports.getDadosMensais = async (req, res) => {
    try {
        const { mesAno, planta } = req.query;
        if (!mesAno) { return res.status(400).json({ message: "O parâmetro 'mesAno' (formato YYYY-MM) é obrigatório." }); }
        const [ano, mes] = mesAno.split('-');
        if (!ano || !mes) { return res.status(400).json({ message: "Formato de 'mesAno' inválido. Use YYYY-MM." }); }
        const pool = await poolPromiseAcessos;
        const request = pool.request();
        request.input('ano', sql.Int, ano);
        request.input('mes', sql.Int, mes);
        let plantaFilterClause = '';
        if (planta) {
            let nomePlantaNoBanco = '';
            if (planta === 'vinhedo') nomePlantaNoBanco = 'Vinhedo';
            else if (planta === 'sao_bernardo') nomePlantaNoBanco = 'São Bernardo';
            else if (planta === 'jarinu') nomePlantaNoBanco = 'Jarinu';
            if (nomePlantaNoBanco) { plantaFilterClause = `AND Nome_Planta = '${nomePlantaNoBanco}'`; }
        }
        const query = `
            WITH PairedEvents AS (
                SELECT Nome_Colaborador, Nome_Area, Data_Hora_Evento AS HoraEntrada,
                       LEAD(Data_Hora_Evento, 1) OVER (PARTITION BY Nome_Colaborador, Nome_Area, CAST(Data_Hora_Evento AS DATE) ORDER BY Data_Hora_Evento) AS HoraSaida
                FROM [acessos].[dbo].[vw_log_acessos]
                WHERE YEAR(Data_Hora_Evento) = @ano AND MONTH(Data_Hora_Evento) = @mes AND Nome_Colaborador IS NOT NULL AND Nome_Area IS NOT NULL ${plantaFilterClause}
            )
            SELECT Nome_Colaborador AS Colaborador, Nome_Area AS Areas, HoraEntrada AS PassagemCracha, HoraSaida AS HoraPosterior, DATEDIFF(second, HoraEntrada, HoraSaida) AS DuracaoSegundos
            FROM PairedEvents WHERE HoraSaida IS NOT NULL AND DATEDIFF(second, HoraEntrada, HoraSaida) > 0;
        `;
        const result = await request.query(query);
        const dadosFormatados = result.recordset.map(item => ({
            Colaborador: item.Colaborador, Áreas: item.Areas,
            PassagemCracha: item.PassagemCracha ? item.PassagemCracha.toISOString().substr(11, 8) : 'N/A',
            HoraPosterior: item.HoraPosterior ? item.HoraPosterior.toISOString().substr(11, 8) : 'N/A',
            Subtração: formatarSegundos(item.DuracaoSegundos),
            HoraDecimal: (item.DuracaoSegundos || 0) / 3600
        }));
        res.status(200).json(dadosFormatados);
    } catch (error) {
        console.error("ERRO DETALHADO NO BACKEND (Dados Mensais):", error);
        res.status(500).json({ message: "Erro interno do servidor ao buscar dados mensais do dashboard." });
    }
};

exports.getDashboardAnalytics = async (req, res) => {
    try {
        const { mesAno, planta } = req.query;
        if (!mesAno) { return res.status(400).json({ message: "O parâmetro 'mesAno' (formato YYYY-MM) é obrigatório." }); }
        const [ano, mes] = mesAno.split('-');
        if (!ano || !mes) { return res.status(400).json({ message: "Formato de 'mesAno' inválido. Use YYYY-MM." }); }
        const pool = await poolPromiseAcessos;
        let plantaFilterClause = '';
        if (planta) {
            let nomePlantaNoBanco = '';
            if (planta === 'vinhedo') nomePlantaNoBanco = 'Vinhedo';
            else if (planta === 'sao_bernardo') nomePlantaNoBanco = 'São Bernardo';
            else if (planta === 'jarinu') nomePlantaNoBanco = 'Jarinu';
            if (nomePlantaNoBanco) { plantaFilterClause = `AND Nome_Planta = '${nomePlantaNoBanco}'`; }
        }
        const baseQuery = `
            WITH PairedEvents AS (
                SELECT Nome_Area, Nome_Dispositivo, CAST(Data_Hora_Evento AS DATE) as Dia,
                       DATEDIFF(second, Data_Hora_Evento, LEAD(Data_Hora_Evento, 1) OVER (PARTITION BY Nome_Colaborador, Nome_Area, CAST(Data_Hora_Evento AS DATE) ORDER BY Data_Hora_Evento)) AS DuracaoSegundos
                FROM [acessos].[dbo].[vw_log_acessos]
                WHERE YEAR(Data_Hora_Evento) = @ano AND MONTH(Data_Hora_Evento) = @mes AND Nome_Colaborador IS NOT NULL AND Nome_Area IS NOT NULL ${plantaFilterClause}
            )
        `;
        const requestTemplate = () => pool.request().input('ano', sql.Int, ano).input('mes', sql.Int, mes);
        const queryPorArea = requestTemplate().query(`${baseQuery} SELECT Nome_Area, SUM(DuracaoSegundos) / 3600.0 AS TotalHoras FROM PairedEvents WHERE DuracaoSegundos > 0 GROUP BY Nome_Area ORDER BY TotalHoras DESC`);
        const queryPorDispositivo = requestTemplate().query(`${baseQuery} SELECT Nome_Dispositivo, SUM(DuracaoSegundos) / 3600.0 AS TotalHoras FROM PairedEvents WHERE DuracaoSegundos > 0 GROUP BY Nome_Dispositivo ORDER BY TotalHoras DESC`);
        const queryTendenciaDiaria = requestTemplate().query(`${baseQuery} SELECT Dia, SUM(DuracaoSegundos) / 3600.0 AS TotalHoras FROM PairedEvents WHERE DuracaoSegundos > 0 GROUP BY Dia ORDER BY Dia ASC`);
        const [resultArea, resultDispositivo, resultTendencia] = await Promise.all([queryPorArea, queryPorDispositivo, queryTendenciaDiaria]);
        res.status(200).json({
            porArea: resultArea.recordset,
            porDispositivo: resultDispositivo.recordset,
            tendenciaDiaria: resultTendencia.recordset
        });
    } catch (error) {
        console.error("ERRO DETALHADO NO BACKEND (Analytics):", error);
        res.status(500).json({ message: "Erro interno do servidor ao buscar dados analíticos." });
    }
};

exports.getUserInfo = async (req, res) => {
    if (req.session && req.session.userName) {
        res.status(200).json({
            nome: req.session.userName,
            cargo: req.session.userCargo
        });
    } else {
        res.status(404).json({ message: 'Informações do usuário não encontradas na sessão.' });
    }
};

exports.getMachineStatus = async (req, res) => {
    try {
        const { planta } = req.params;
        const dataConsulta = req.query.data || new Date().toISOString().split('T')[0];

        let nomeBancoEstrutura = '';
        if (planta.toLowerCase() === 'mlb') {
            nomeBancoEstrutura = 'cadastros_mlb'; 
        } else if (planta.toLowerCase() === 'mmb') {
            nomeBancoEstrutura = 'cadastros_mmb';
        } else if (planta.toLowerCase() === 'mjn') {
            nomeBancoEstrutura = 'cadastros_mjn'; 
        } else {
            return res.status(404).json({ message: "Planta não encontrada." });
        }

        const pool = await poolPromiseAcessos;

        let queryEstrutura = `
            SELECT 
                setor,
                maquina
            FROM 
                [${nomeBancoEstrutura}].[dbo].[vw_DetalhesMaquinas]
            WHERE
                planta = @siglaPlanta
        `;
        
        if (planta.toLowerCase() === 'mlb') {
            queryEstrutura += ` AND UPPER(TRIM(maquina)) <> 'MONTAGEM MANUAL'`;
            queryEstrutura += ` AND UPPER(TRIM(setor)) NOT IN ('MONTAGEM MANUAL', 'TERCERIZAÇÃO')`;
        }
        
        queryEstrutura += ' ORDER BY maquina ASC;';

        const estruturaResult = await pool.request()
            .input('siglaPlanta', sql.VarChar, planta.toUpperCase())
            .query(queryEstrutura);

        const queryOperadores = `
            SELECT
                Linha,
                SUM(CASE WHEN Status = 'Entrada' THEN 1 ELSE -1 END) as OperadoresAtuais
            FROM 
                [dbo].[Apontamento_Operador]
            WHERE 
                CAST(Data AS DATE) = @DataConsulta
            GROUP BY Linha
            HAVING SUM(CASE WHEN Status = 'Entrada' THEN 1 ELSE -1 END) > 0;
        `;
        const operadoresResult = await pool.request()
            .input('DataConsulta', sql.Date, dataConsulta)
            .query(queryOperadores);

        const mapaOperadores = new Map(
            operadoresResult.recordset.map(item => [item.Linha, item.OperadoresAtuais])
        );

        const paresParaAgrupar = {
            's.LA01st': 's.LA02st',
            's.LA03gm': 's.LA04gm',
            's.LA05gm': 's.LA06gm',
            's.LA07re': 's.LA08re'
        };
        const maquinasProcessadas = new Set();

        const setores = {};
        estruturaResult.recordset.forEach(maquinaInfo => {
            const nomeMaquina = maquinaInfo.maquina;
            if (maquinasProcessadas.has(nomeMaquina)) {
                return;
            }

            const nomeSetor = maquinaInfo.setor === 'SMALL' ? 'Montagem Small' : maquinaInfo.setor;

            if (!setores[nomeSetor]) {
                setores[nomeSetor] = { nome: nomeSetor, maquinas: [] };
            }
            
            let operadoresAtuais = mapaOperadores.get(nomeMaquina) || 0;
            let nomeExibicao = nomeMaquina;
            
            const par = paresParaAgrupar[nomeMaquina];
            if (par) {
                operadoresAtuais += mapaOperadores.get(par) || 0;
                nomeExibicao = `${nomeMaquina} & ${par}`;
                maquinasProcessadas.add(par);
            }

            setores[nomeSetor].maquinas.push({
                nome: nomeExibicao,
                operadores_atuais: operadoresAtuais,
            });
        });
        
        const ordemDosSetores = ["Injeção", "Montagem Small", "Montagem Lanterna", "Metalização", "Pintura"];
        
        const dadosOrdenados = Object.values(setores).sort((a, b) => {
            const indexA = ordemDosSetores.indexOf(a.nome);
            const indexB = ordemDosSetores.indexOf(b.nome);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        res.status(200).json({ dados: dadosOrdenados });

    } catch (error) {
        console.error("Erro ao buscar status das máquinas:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

exports.getPlantDashboardData = async (req, res) => {
    try {
        const { planta } = req.params;
        const { dataInicio, dataFim } = req.query;

        if (!dataInicio || !dataFim || !planta) {
            return res.status(400).json({ message: "Os parâmetros 'planta', 'dataInicio' e 'dataFim' são obrigatórios." });
        }
        
        let prefixoPlanta = '';
        let nomePlantaNoBanco = '';
        if (planta.toLowerCase() === 'mlb') { prefixoPlanta = 's.'; nomePlantaNoBanco = 'São Bernardo'; }
        else if (planta.toLowerCase() === 'mmb') { prefixoPlanta = 'v.'; nomePlantaNoBanco = 'Vinhedo'; }
        else if (planta.toLowerCase() === 'mjn') { prefixoPlanta = 'j.'; nomePlantaNoBanco = 'Jarinu'; }
        else { return res.status(404).json({ message: "Planta não encontrada." }); }

        const pool = await poolPromiseAcessos;

        // ======================= QUERY FINAL, SIMPLES E ROBUSTA =======================
        const query = `
            SELECT
                Linha AS Maquina,
                -- Soma a diferença total de segundos e converte para horas
                SUM(DATEDIFF(second, HoraEntrada, HoraSaida)) / 3600.0 AS TotalHoras
            FROM (
                SELECT
                    Pessoa,
                    Linha,
                    -- Pega o primeiro evento de ENTRADA do dia para um operador/linha
                    MIN(CASE WHEN Status = 'Entrada' THEN CAST(CAST(Data AS DATE) AS DATETIME) + CAST(CAST(Hora AS TIME) AS DATETIME) END) AS HoraEntrada,
                    -- Pega o último evento de SAÍDA do dia para o mesmo operador/linha
                    MAX(CASE WHEN Status = 'Saída' THEN CAST(CAST(Data AS DATE) AS DATETIME) + CAST(CAST(Hora AS TIME) AS DATETIME) END) AS HoraSaida
                FROM
                    [acessos].[dbo].[Apontamento_Operador]
                WHERE
                    CAST(Data AS DATE) BETWEEN @dataInicio AND @dataFim
                    AND Linha LIKE @prefixo + '%'
                GROUP BY
                    Pessoa, Linha, CAST(Data AS DATE)
            ) AS Agregado
            WHERE
                HoraEntrada IS NOT NULL AND HoraSaida IS NOT NULL
            GROUP BY
                Linha
            ORDER BY
                TotalHoras DESC;
        `;
        // ==============================================================================

        const result = await pool.request()
            .input('dataInicio', sql.Date, dataInicio)
            .input('dataFim', sql.Date, dataFim)
            .input('prefixo', sql.VarChar, prefixoPlanta)
            .query(query);
        
        const setores = {};
        result.recordset.forEach(row => {
            let setorNome = 'Outros';
            if (row.Maquina.includes('SM')) setorNome = 'Montagem Small';
            else if (row.Maquina.includes('MT')) setorNome = 'Metalização';
            else if (row.Maquina.includes('LA')) setorNome = 'Montagem Lanternas';
            else if (row.Maquina.includes('I') || row.Maquina.includes('h1k')) setorNome = 'Injeção';
            
            if (!setores[setorNome]) {
                setores[setorNome] = { nome: setorNome, maquinas: [], totalHorasSetor: 0 };
            }
            
            const horas = parseFloat(row.TotalHoras);
            setores[setorNome].maquinas.push({ nome: row.Maquina, horas: horas });
            setores[setorNome].totalHorasSetor += horas;
        });

        res.status(200).json({
            planta: { id: planta.toUpperCase(), nome: nomePlantaNoBanco },
            dados: Object.values(setores)
        });

    } catch (error) {
        console.error("ERRO DETALHADO NO BACKEND (Dashboard Planta):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

exports.getRawApontamentos = async (req, res) => {
    console.log("Rota de debug /debug/apontamentos foi chamada.");
    try {
        const pool = await poolPromiseAcessos;
        const result = await pool.request()
            .query(`
                SELECT TOP (1000) 
                    ID, Data, Turno, Pessoa, Cargo, Linha, Qntd_Esperada, 
                    Qntd_Real, Operacao, Hora, Status, prod_LE, prod_LD, prod_Unico
                FROM [acessos].[dbo].[Apontamento_Operador]
                ORDER BY ID DESC
            `);

        console.log(`Debug: ${result.recordset.length} registros encontrados na tabela Apontamento_Operador.`);
        
        // Retorna os dados como JSON
        res.status(200).json(result.recordset);

    } catch (error) {
        console.error("ERRO NA ROTA DE DEBUG:", error);
        res.status(500).json({ message: "Erro ao buscar dados brutos.", error: error.message });
    }
};

exports.getIndicadoresRawData = async (req, res) => {
    try {
        const { planta } = req.params;
        const { dataInicio, dataFim } = req.query;

        if (!dataInicio || !dataFim || !planta) {
            return res.status(400).json({ message: "Parâmetros obrigatórios ausentes." });
        }

        let prefixoPlanta = '';
        if (planta.toLowerCase() === 'mlb') prefixoPlanta = 's.';
        else if (planta.toLowerCase() === 'mmb') prefixoPlanta = 'v.';
        else if (planta.toLowerCase() === 'mjn') prefixoPlanta = 'j.';
        else return res.status(404).json({ message: "Planta não encontrada." });

        const pool = await poolPromiseAcessos;

        const query = `
            SELECT 
                Pessoa,
                Linha,
                Status,
                -- Combina Data e Hora em um único campo datetime
                CAST(CAST(Data AS DATE) AS DATETIME) + CAST(CAST(Hora AS TIME) AS DATETIME) AS DataHora
            FROM 
                [acessos].[dbo].[Apontamento_Operador]
            WHERE
                CAST(Data AS DATE) BETWEEN @dataInicio AND @dataFim
                AND Linha LIKE @prefixo + '%';
        `;

        const result = await pool.request()
            .input('dataInicio', sql.Date, dataInicio)
            .input('dataFim', sql.Date, dataFim)
            .input('prefixo', sql.VarChar, prefixoPlanta)
            .query(query);

        res.status(200).json(result.recordset);

    } catch (error) {
        console.error("ERRO AO BUSCAR DADOS BRUTOS:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};
exports.getIndicadoresData = async (req, res) => {
    try {
        const { planta } = req.params;
        const { dataInicio, dataFim } = req.query;

        if (!dataInicio || !dataFim || !planta) {
            return res.status(400).json({ message: "Parâmetros obrigatórios ausentes." });
        }

        // Mapeia a sigla da URL para o nome completo da planta usado na view
        let nomePlantaNoBanco = '';
        if (planta.toLowerCase() === 'mlb') nomePlantaNoBanco = 'São Bernardo';
        else if (planta.toLowerCase() === 'mmb') nomePlantaNoBanco = 'Vinhedo';
        else if (planta.toLowerCase() === 'mjn') nomePlantaNoBanco = 'Jarinu';
        else return res.status(404).json({ message: "Planta não encontrada." });

        const pool = await poolPromiseAcessos;

        // QUERY FINAL E SIMPLIFICADA USANDO A NOVA VIEW
        const query = `
            SELECT 
                Pessoa,
                Linha,
                Status,
                -- Combina Data e Hora em um único campo datetime
                CAST(CAST(Data AS DATE) AS DATETIME) + CAST(CAST(Hora AS TIME) AS DATETIME) AS DataHora
            FROM 
                [acessos].[dbo].[vw_Apontamentos_Com_Planta]
            WHERE
                CAST(Data AS DATE) BETWEEN @dataInicio AND @dataFim
                AND PlantaNome = @nomePlanta;
        `;

        const result = await pool.request()
            .input('dataInicio', sql.Date, dataInicio)
            .input('dataFim', sql.Date, dataFim)
            .input('nomePlanta', sql.VarChar, nomePlantaNoBanco)
            .query(query);

        res.status(200).json(result.recordset);

    } catch (error) {
        console.error("ERRO AO BUSCAR DADOS DE INDICADORES:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};