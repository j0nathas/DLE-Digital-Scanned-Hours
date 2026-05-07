
const { sql, poolPromise } = require('../config/db');

// GET ALL
exports.getAllScheduls = async (req, res) => {
    try {
        const pool = await poolPromise();
        const result = await pool.request().query('SELECT * FROM dbo.Scheduls');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET BY ID
exports.getSchedulsById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const result = await pool.request()
            .input('id', sql.BigInt, id)
            .query('SELECT * FROM dbo.Scheduls WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Scheduls não encontrado(a).' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE NEW
exports.createScheduls = async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const columns = [];
        const variables = [];
        const columnMap = {
    "id": "bigint",
    "name": "varchar",
    "sundayStart": "int",
    "sundayEnd": "int",
    "mondayStart": "int",
    "mondayEnd": "int",
    "tuesdayStart": "int",
    "tuesdayEnd": "int",
    "wednesdayStart": "int",
    "wednesdayEnd": "int",
    "thursdayStart": "int",
    "thursdayEnd": "int",
    "fridayStart": "int",
    "fridayEnd": "int",
    "saturdayStart": "int",
    "saturdayEnd": "int"
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
        
        const query = `INSERT INTO dbo.Scheduls (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${variables.join(', ')});`;
        const result = await request.query(query);
        res.status(201).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE
exports.updateScheduls = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const setClauses = [];
        const columnMap = {
    "id": "bigint",
    "name": "varchar",
    "sundayStart": "int",
    "sundayEnd": "int",
    "mondayStart": "int",
    "mondayEnd": "int",
    "tuesdayStart": "int",
    "tuesdayEnd": "int",
    "wednesdayStart": "int",
    "wednesdayEnd": "int",
    "thursdayStart": "int",
    "thursdayEnd": "int",
    "fridayStart": "int",
    "fridayEnd": "int",
    "saturdayStart": "int",
    "saturdayEnd": "int"
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

        const query = `UPDATE dbo.Scheduls SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Scheduls não encontrado(a) para atualização.' });
        }
        res.status(200).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE
exports.deleteScheduls = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const request = pool.request();
        const query = `DELETE FROM dbo.Scheduls OUTPUT DELETED.id WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Scheduls não encontrado(a) para deletar.' });
        }

        res.status(200).json({ message: `${modelName} com ID ${result.recordset[0].id} foi deletado(a).` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
