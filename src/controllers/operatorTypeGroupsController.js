
const { sql, poolPromise } = require('../config/db');

// GET ALL
exports.getAllOperatorTypeGroups = async (req, res) => {
    try {
        const pool = await poolPromise();
        const result = await pool.request().query('SELECT * FROM dbo.OperatorTypeGroups');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET BY ID
exports.getOperatorTypeGroupsById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const result = await pool.request()
            .input('id', sql.BigInt, id)
            .query('SELECT * FROM dbo.OperatorTypeGroups WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'OperatorTypeGroups não encontrado(a).' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE NEW
exports.createOperatorTypeGroups = async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const columns = [];
        const variables = [];
        const columnMap = {
    "id": "bigint",
    "idOperatorType": "bigint",
    "idGroup": "bigint"
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
        
        const query = `INSERT INTO dbo.OperatorTypeGroups (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${variables.join(', ')});`;
        const result = await request.query(query);
        res.status(201).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE
exports.updateOperatorTypeGroups = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const setClauses = [];
        const columnMap = {
    "id": "bigint",
    "idOperatorType": "bigint",
    "idGroup": "bigint"
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

        const query = `UPDATE dbo.OperatorTypeGroups SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'OperatorTypeGroups não encontrado(a) para atualização.' });
        }
        res.status(200).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE
exports.deleteOperatorTypeGroups = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const request = pool.request();
        const query = `DELETE FROM dbo.OperatorTypeGroups OUTPUT DELETED.id WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'OperatorTypeGroups não encontrado(a) para deletar.' });
        }

        res.status(200).json({ message: `${modelName} com ID ${result.recordset[0].id} foi deletado(a).` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
