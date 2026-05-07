const { sql, poolPromise } = require('../config/db');


exports.getAllUsers = async (req, res) => {
    try {
        const pool = await poolPromise();
        const result = await pool.request().query('SELECT * FROM dbo.Users WHERE deleted = 0');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const result = await pool.request()
            .input('userId', sql.Int, id)
            .query('SELECT * FROM dbo.Users WHERE id = @userId AND deleted = 0');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.createUser = async (req, res) => {
    try {
        const userData = req.body;

        
        if (!userData.name || !userData.registration) {
            return res.status(400).json({ message: 'Nome (name) e Matrícula (registration) são obrigatórios.' });
        }

        const pool = await poolPromise();
        const request = pool.request();

        const columns = [];
        const variables = [];

        
        const columnTypeMap = {
            name: sql.NVarChar, registration: sql.NVarChar, pis: sql.NVarChar, senha: sql.NVarChar,
            barras: sql.NVarChar, cpf: sql.NVarChar, rg: sql.NVarChar, phone: sql.NVarChar,
            email: sql.NVarChar, emailAcesso: sql.NVarChar, hash: sql.NVarChar, salt: sql.NVarChar,
            admin: sql.Bit, inativo: sql.Bit, contingency: sql.Bit, deleted: sql.Bit,
            idDevice: sql.Int, photoTimestamp: sql.BigInt, photoIdFaceState: sql.Int, photoDeleted: sql.Bit,
            canUseFacial: sql.Bit, endereco: sql.NVarChar, bairro: sql.NVarChar, cidade: sql.NVarChar,
            cep: sql.NVarChar, cargo: sql.NVarChar, admissao: sql.Date, telefone: sql.NVarChar,
            ramal: sql.NVarChar, pai: sql.NVarChar, mae: sql.NVarChar, nascimento: sql.Date,
            sexo: sql.NVarChar, estadoCivil: sql.NVarChar, nacionalidade: sql.NVarChar,
            naturalidade: sql.NVarChar, idResponsavel: sql.Int, responsavelNome: sql.NVarChar,
            veiculo_marca: sql.NVarChar, veiculo_modelo: sql.NVarChar, veiculo_cor: sql.NVarChar,
            veiculo_placa: sql.NVarChar, idType: sql.Int, dateLimit: sql.DateTime, expireOnDateLimit: sql.Bit,
            visitorCompany: sql.NVarChar, blackList: sql.Bit, dateStartLimit: sql.DateTime,
            pisAnterior: sql.NVarChar, comments: sql.NVarChar, allowParkingSpotCompany: sql.Bit,
            idArea: sql.Int, dataLastLog: sql.DateTime
            
        };

        
        for (const [column, type] of Object.entries(columnTypeMap)) {
            if (userData[column] !== undefined && userData[column] !== null) {
                columns.push(column);
                variables.push(`@${column}`);
                request.input(column, type, userData[column]);
            }
        }
        
        
        columns.push('timeOfRegistration');
        variables.push('GETDATE()');

        if (columns.length === 1) { 
            return res.status(400).json({ message: 'Nenhum campo válido fornecido para criar o usuário.' });
        }
        
        const query = `INSERT INTO dbo.Users (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${variables.join(', ')});`;
        
        const result = await request.query(query);

        res.status(201).json(result.recordset[0]);

    } catch (err) {
        if (err.number === 2627) { 
             return res.status(409).json({ message: 'Conflito: Já existe um usuário com esses dados (matrícula, PIS, etc).', error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};


exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const fieldsToUpdate = req.body;

        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
        }

        const pool = await poolPromise();
        const request = pool.request();

        const setClauses = [];
        const columnTypeMap = { 
            name: sql.NVarChar, registration: sql.NVarChar, pis: sql.NVarChar, senha: sql.NVarChar,
            barras: sql.NVarChar, cpf: sql.NVarChar, rg: sql.NVarChar, phone: sql.NVarChar,
            email: sql.NVarChar, emailAcesso: sql.NVarChar, hash: sql.NVarChar, salt: sql.NVarChar,
            admin: sql.Bit, inativo: sql.Bit, contingency: sql.Bit, deleted: sql.Bit,
            idDevice: sql.Int, photoTimestamp: sql.BigInt, photoIdFaceState: sql.Int, photoDeleted: sql.Bit,
            canUseFacial: sql.Bit, endereco: sql.NVarChar, bairro: sql.NVarChar, cidade: sql.NVarChar,
            cep: sql.NVarChar, cargo: sql.NVarChar, admissao: sql.Date, telefone: sql.NVarChar,
            ramal: sql.NVarChar, pai: sql.NVarChar, mae: sql.NVarChar, nascimento: sql.Date,
            sexo: sql.NVarChar, estadoCivil: sql.NVarChar, nacionalidade: sql.NVarChar,

            naturalidade: sql.NVarChar, idResponsavel: sql.Int, responsavelNome: sql.NVarChar,
            veiculo_marca: sql.NVarChar, veiculo_modelo: sql.NVarChar, veiculo_cor: sql.NVarChar,
            veiculo_placa: sql.NVarChar, idType: sql.Int, dateLimit: sql.DateTime, expireOnDateLimit: sql.Bit,
            visitorCompany: sql.NVarChar, blackList: sql.Bit, dateStartLimit: sql.DateTime,
            pisAnterior: sql.NVarChar, comments: sql.NVarChar, allowParkingSpotCompany: sql.Bit,
            idArea: sql.Int, dataLastLog: sql.DateTime
        };

        for (const [key, value] of Object.entries(fieldsToUpdate)) {
            if (columnTypeMap[key]) { 
                setClauses.push(`${key} = @${key}`);
                request.input(key, columnTypeMap[key], value);
            }
        }
        
        if (setClauses.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido para atualização.' });
        }

        const query = `UPDATE dbo.Users SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @userId;`;
        
        request.input('userId', sql.Int, id);
        const result = await request.query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado para atualização.' });
        }

        res.status(200).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const request = pool.request();

        const query = `UPDATE dbo.Users SET deleted = 1, inativo = 1 OUTPUT DELETED.id WHERE id = @userId;`;
        request.input('userId', sql.Int, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado para deletar.' });
        }

        res.status(200).json({ message: `Usuário com ID ${result.recordset[0].id} foi marcado como deletado.` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};