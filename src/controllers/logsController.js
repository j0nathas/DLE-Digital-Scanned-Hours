
const { sql, poolPromise } = require('../config/db');

// GET ALL
exports.getAllLogs = async (req, res) => {
    try {
        const pool = await poolPromise();
        const result = await pool.request().query('SELECT * FROM dbo.Logs');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET BY ID
exports.getLogsById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const result = await pool.request()
            .input('id', sql.BigInt, id)
            .query('SELECT * FROM dbo.Logs WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Logs não encontrado(a).' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE NEW
exports.createLogs = async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const columns = [];
        const variables = [];
        const columnMap = {
    "id": "bigint",
    "idDevice": "bigint",
    "deviceName": "varchar",
    "idLogDevice": "bigint",
    "ResetCount": "bigint",
    "timeInicioAutorizacao": "datetime",
    "time": "datetime",
    "event": "int",
    "idArea": "bigint",
    "area": "varchar",
    "isVehicle": "bit",
    "idParking": "bigint",
    "idAccessRule": "bigint",
    "idCause": "int",
    "idAttEvent": "int",
    "reader": "int",
    "Quality": "int",
    "CalcVar": "int",
    "Score": "int",
    "Score2": "int",
    "confidence": "int",
    "CPU": "int",
    "TotalTime": "int",
    "identificationTime": "int",
    "identificationCount": "int",
    "idUser": "bigint",
    "userName": "varchar",
    "visitedCompany": "varchar",
    "idVehicle": "bigint",
    "vehicPlate": "varchar",
    "info": "varchar",
    "accessInfo": "varchar",
    "loadByDeviceIdTime": "int",
    "deleteCardsTime": "int",
    "loadUserTime": "int",
    "verifyPasswordTime": "int",
    "selectLogTime": "int",
    "canAccessTime": "int",
    "canAccess2Time": "int",
    "loadAreasTime": "int",
    "adeDisableTime": "int",
    "loadPhotoTime": "int",
    "matchByImageTime": "int",
    "selectGroupAccessRulesTime": "int",
    "selectTypeAccessRulesTime": "int",
    "selectUserAccessRulesTime": "int",
    "identificationName": "varchar",
    "idLogTypeAtDevice": "bigint",
    "idCreditType": "bigint",
    "creditSubtractTime": "int",
    "creditAnalysisTime": "int",
    "creditLogsTime": "int",
    "creditBalanceTime": "int",
    "idOperator": "bigint",
    "authOperator": "varchar",
    "DtLockedByRandomInspect": "datetime",
    "DtRandomInspectDone": "datetime",
    "functionDetail": "int",
    "visitedIdGroup": "bigint",
    "visitedGroupName": "varchar",
    "visitedIdUser": "bigint",
    "visitedUserName": "varchar",
    "coluna1": "int",
    "coluna2": "int",
    "innovatricsExtractTime": "int",
    "innovatricsFindTime": "int",
    "relay": "int",
    "idUserEscort": "bigint",
    "receivedCardNumber": "bigint",
    "CardNumberConvertedByConfig": "bigint"
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
        
        const query = `INSERT INTO dbo.Logs (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${variables.join(', ')});`;
        const result = await request.query(query);
        res.status(201).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE
exports.updateLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const setClauses = [];
        const columnMap = {
    "id": "bigint",
    "idDevice": "bigint",
    "deviceName": "varchar",
    "idLogDevice": "bigint",
    "ResetCount": "bigint",
    "timeInicioAutorizacao": "datetime",
    "time": "datetime",
    "event": "int",
    "idArea": "bigint",
    "area": "varchar",
    "isVehicle": "bit",
    "idParking": "bigint",
    "idAccessRule": "bigint",
    "idCause": "int",
    "idAttEvent": "int",
    "reader": "int",
    "Quality": "int",
    "CalcVar": "int",
    "Score": "int",
    "Score2": "int",
    "confidence": "int",
    "CPU": "int",
    "TotalTime": "int",
    "identificationTime": "int",
    "identificationCount": "int",
    "idUser": "bigint",
    "userName": "varchar",
    "visitedCompany": "varchar",
    "idVehicle": "bigint",
    "vehicPlate": "varchar",
    "info": "varchar",
    "accessInfo": "varchar",
    "loadByDeviceIdTime": "int",
    "deleteCardsTime": "int",
    "loadUserTime": "int",
    "verifyPasswordTime": "int",
    "selectLogTime": "int",
    "canAccessTime": "int",
    "canAccess2Time": "int",
    "loadAreasTime": "int",
    "adeDisableTime": "int",
    "loadPhotoTime": "int",
    "matchByImageTime": "int",
    "selectGroupAccessRulesTime": "int",
    "selectTypeAccessRulesTime": "int",
    "selectUserAccessRulesTime": "int",
    "identificationName": "varchar",
    "idLogTypeAtDevice": "bigint",
    "idCreditType": "bigint",
    "creditSubtractTime": "int",
    "creditAnalysisTime": "int",
    "creditLogsTime": "int",
    "creditBalanceTime": "int",
    "idOperator": "bigint",
    "authOperator": "varchar",
    "DtLockedByRandomInspect": "datetime",
    "DtRandomInspectDone": "datetime",
    "functionDetail": "int",
    "visitedIdGroup": "bigint",
    "visitedGroupName": "varchar",
    "visitedIdUser": "bigint",
    "visitedUserName": "varchar",
    "coluna1": "int",
    "coluna2": "int",
    "innovatricsExtractTime": "int",
    "innovatricsFindTime": "int",
    "relay": "int",
    "idUserEscort": "bigint",
    "receivedCardNumber": "bigint",
    "CardNumberConvertedByConfig": "bigint"
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

        const query = `UPDATE dbo.Logs SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Logs não encontrado(a) para atualização.' });
        }
        res.status(200).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE
exports.deleteLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const request = pool.request();
        const query = `DELETE FROM dbo.Logs OUTPUT DELETED.id WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Logs não encontrado(a) para deletar.' });
        }

        res.status(200).json({ message: `${modelName} com ID ${result.recordset[0].id} foi deletado(a).` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
