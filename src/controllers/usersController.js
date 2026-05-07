
const { sql, poolPromise } = require('../config/db');

// GET ALL
exports.getAllUsers = async (req, res) => {
    try {
        const pool = await poolPromise();
        const result = await pool.request().query('SELECT * FROM dbo.Users');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET BY ID
exports.getUsersById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const result = await pool.request()
            .input('id', sql.BigInt, id)
            .query('SELECT * FROM dbo.Users WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Users não encontrado(a).' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE NEW
exports.createUsers = async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const columns = [];
        const variables = [];
        const columnMap = {
    "id": "bigint",
    "name": "varchar",
    "registration": "varchar",
    "pis": "bigint",
    "senha": "bigint",
    "barras": "varchar",
    "cpf": "varchar",
    "rg": "varchar",
    "phone": "varchar",
    "email": "varchar",
    "emailAcesso": "varchar",
    "hash": "varchar",
    "salt": "varchar",
    "admin": "bit",
    "inativo": "bit",
    "contingency": "bit",
    "deleted": "bit",
    "idDevice": "bigint",
    "photoTimestamp": "bigint",
    "photoIdFaceState": "int",
    "photoDeleted": "bit",
    "canUseFacial": "bit",
    "endereco": "varchar",
    "bairro": "varchar",
    "cidade": "varchar",
    "cep": "varchar",
    "cargo": "varchar",
    "admissao": "datetime",
    "telefone": "varchar",
    "ramal": "varchar",
    "pai": "varchar",
    "mae": "varchar",
    "nascimento": "datetime",
    "sexo": "varchar",
    "estadoCivil": "varchar",
    "nacionalidade": "varchar",
    "naturalidade": "varchar",
    "idResponsavel": "bigint",
    "responsavelNome": "varchar",
    "veiculo_marca": "varchar",
    "veiculo_modelo": "varchar",
    "veiculo_cor": "varchar",
    "veiculo_placa": "varchar",
    "idType": "int",
    "dateLimit": "datetime",
    "expireOnDateLimit": "bit",
    "visitorCompany": "varchar",
    "blackList": "bit",
    "dateStartLimit": "datetime",
    "pisAnterior": "bigint",
    "comments": "varchar",
    "allowParkingSpotCompany": "bit",
    "idArea": "bigint",
    "dataLastLog": "datetime",
    "timeOfRegistration": "datetime",
    "objectGuid": "varchar"
};

        for (const [column, typeStr] of Object.entries(columnMap)) {
            if (data[column] !== undefined && data[column] !== null) {
                columns.push(column);
                variables.push(`@${column}`);
                // O tipo sql precisa ser avaliado a partir da string
                const sqlType = eval(typeStr); 
                request.input(column, sqlType, data[column]);
            }
        }

        if (columns.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido.' });
        }
        
        const query = `INSERT INTO dbo.Users (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${variables.join(', ')});`;
        const result = await request.query(query);
        res.status(201).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE
exports.updateUsers = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const setClauses = [];
        const columnMap = {
    "id": "bigint",
    "name": "varchar",
    "registration": "varchar",
    "pis": "bigint",
    "senha": "bigint",
    "barras": "varchar",
    "cpf": "varchar",
    "rg": "varchar",
    "phone": "varchar",
    "email": "varchar",
    "emailAcesso": "varchar",
    "hash": "varchar",
    "salt": "varchar",
    "admin": "bit",
    "inativo": "bit",
    "contingency": "bit",
    "deleted": "bit",
    "idDevice": "bigint",
    "photoTimestamp": "bigint",
    "photoIdFaceState": "int",
    "photoDeleted": "bit",
    "canUseFacial": "bit",
    "endereco": "varchar",
    "bairro": "varchar",
    "cidade": "varchar",
    "cep": "varchar",
    "cargo": "varchar",
    "admissao": "datetime",
    "telefone": "varchar",
    "ramal": "varchar",
    "pai": "varchar",
    "mae": "varchar",
    "nascimento": "datetime",
    "sexo": "varchar",
    "estadoCivil": "varchar",
    "nacionalidade": "varchar",
    "naturalidade": "varchar",
    "idResponsavel": "bigint",
    "responsavelNome": "varchar",
    "veiculo_marca": "varchar",
    "veiculo_modelo": "varchar",
    "veiculo_cor": "varchar",
    "veiculo_placa": "varchar",
    "idType": "int",
    "dateLimit": "datetime",
    "expireOnDateLimit": "bit",
    "visitorCompany": "varchar",
    "blackList": "bit",
    "dateStartLimit": "datetime",
    "pisAnterior": "bigint",
    "comments": "varchar",
    "allowParkingSpotCompany": "bit",
    "idArea": "bigint",
    "dataLastLog": "datetime",
    "timeOfRegistration": "datetime",
    "objectGuid": "varchar"
};

        for (const [column, typeStr] of Object.entries(columnMap)) {
            if (data[column] !== undefined && data[column] !== null && column !== 'id') {
                setClauses.push(`${column} = @${column}`);
                const sqlType = eval(typeStr);
                request.input(column, sqlType, data[column]);
            }
        }
        
        if (setClauses.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo válido fornecido para atualização.' });
        }

        const query = `UPDATE dbo.Users SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Users não encontrado(a) para atualização.' });
        }
        res.status(200).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE
exports.deleteUsers = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const request = pool.request();
        const query = `DELETE FROM dbo.Users OUTPUT DELETED.id WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Users não encontrado(a) para deletar.' });
        }

        res.status(200).json({ message: `${modelName} com ID ${result.recordset[0].id} foi deletado(a).` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
