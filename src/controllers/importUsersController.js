
const { sql, poolPromise } = require('../config/db');

// GET ALL
exports.getAllImportUsers = async (req, res) => {
    try {
        const pool = await poolPromise();
        const result = await pool.request().query('SELECT * FROM dbo.ImportUsers');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET BY ID
exports.getImportUsersById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const result = await pool.request()
            .input('id', sql.BigInt, id)
            .query('SELECT * FROM dbo.ImportUsers WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'ImportUsers não encontrado(a).' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE NEW
exports.createImportUsers = async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const columns = [];
        const variables = [];
        const columnMap = {
    "id": "bigint",
    "dtCreation": "datetime",
    "groups": "varchar",
    "integrated": "int",
    "dtIntegration": "datetime",
    "errDescription": "varchar",
    "code": "varchar",
    "name": "varchar",
    "registration": "varchar",
    "pis": "bigint",
    "cpf": "varchar",
    "rg": "varchar",
    "phone": "varchar",
    "email": "varchar",
    "emailAcesso": "varchar",
    "inativo": "bit",
    "contingency": "bit",
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
    "dateStartLimit": "datetime",
    "dateLimit": "datetime",
    "blackList": "bit",
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
        
        const query = `INSERT INTO dbo.ImportUsers (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${variables.join(', ')});`;
        const result = await request.query(query);
        res.status(201).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE
exports.updateImportUsers = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const setClauses = [];
        const columnMap = {
    "id": "bigint",
    "dtCreation": "datetime",
    "groups": "varchar",
    "integrated": "int",
    "dtIntegration": "datetime",
    "errDescription": "varchar",
    "code": "varchar",
    "name": "varchar",
    "registration": "varchar",
    "pis": "bigint",
    "cpf": "varchar",
    "rg": "varchar",
    "phone": "varchar",
    "email": "varchar",
    "emailAcesso": "varchar",
    "inativo": "bit",
    "contingency": "bit",
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
    "dateStartLimit": "datetime",
    "dateLimit": "datetime",
    "blackList": "bit",
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

        const query = `UPDATE dbo.ImportUsers SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'ImportUsers não encontrado(a) para atualização.' });
        }
        res.status(200).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE
exports.deleteImportUsers = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const request = pool.request();
        const query = `DELETE FROM dbo.ImportUsers OUTPUT DELETED.id WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'ImportUsers não encontrado(a) para deletar.' });
        }

        res.status(200).json({ message: `${modelName} com ID ${result.recordset[0].id} foi deletado(a).` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
