
const { sql, poolPromise } = require('../config/db');

// GET ALL
exports.getAllDevices = async (req, res) => {
    try {
        const pool = await poolPromise();
        const result = await pool.request().query('SELECT * FROM dbo.Devices');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET BY ID
exports.getDevicesById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const result = await pool.request()
            .input('id', sql.BigInt, id)
            .query('SELECT * FROM dbo.Devices WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Devices não encontrado(a).' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE NEW
exports.createDevices = async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const columns = [];
        const variables = [];
        const columnMap = {
    "id": "bigint",
    "name": "varchar",
    "host": "varchar",
    "port": "int",
    "ssl": "bit",
    "user": "varchar",
    "password": "varchar",
    "model": "int",
    "beep": "bit",
    "leds": "varchar",
    "gatewayMode": "int",
    "operationMode": "int",
    "antiPassback": "bit",
    "dailyReset": "bit",
    "vehicleControl": "bit",
    "bellRelay": "int",
    "urn": "bit",
    "serial": "varchar",
    "versao": "varchar",
    "camera": "varchar",
    "impressora": "varchar",
    "lastDate": "datetime",
    "status": "varchar",
    "panicCard": "bit",
    "dateLastLog": "datetime",
    "dateLastOnline": "datetime",
    "isCurrentlyOnline": "bit",
    "disableAntiPassback": "bit",
    "disableUsb": "bit",
    "keepUserImages": "bit",
    "ResetCount": "int",
    "parentDeviceId": "bigint",
    "entryChildDeviceId": "bigint",
    "maskDetectionEnabled": "int",
    "identificationDistance": "bigint",
    "ledIntensity": "bigint",
    "ledActivationThreshold": "int",
    "sameFaceDetectionInterval": "bigint",
    "limitIdentificationArea": "bit",
    "strictLiveness": "bit",
    "vehicleDetection": "bit",
    "rtspPort": "int",
    "rtspUsername": "varchar",
    "rtspPassword": "varchar",
    "rtspCamera": "int",
    "onvifPort": "int",
    "rtspVideoWidth": "int",
    "rtspVideoHeight": "int",
    "rtspCodec": "varchar",
    "inputMode": "int",
    "idfaceCount": "int",
    "idfacePrimaryEntry": "bit",
    "hasBio": "bit",
    "idLastLogContingency": "bigint",
    "language": "varchar",
    "lastNsr": "int",
    "operationModeVisitor": "int",
    "idIdentificationMode": "bigint",
    "coluna1": "int"
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
        
        const query = `INSERT INTO dbo.Devices (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${variables.join(', ')});`;
        const result = await request.query(query);
        res.status(201).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE
exports.updateDevices = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const pool = await poolPromise();
        const request = pool.request();

        const setClauses = [];
        const columnMap = {
    "id": "bigint",
    "name": "varchar",
    "host": "varchar",
    "port": "int",
    "ssl": "bit",
    "user": "varchar",
    "password": "varchar",
    "model": "int",
    "beep": "bit",
    "leds": "varchar",
    "gatewayMode": "int",
    "operationMode": "int",
    "antiPassback": "bit",
    "dailyReset": "bit",
    "vehicleControl": "bit",
    "bellRelay": "int",
    "urn": "bit",
    "serial": "varchar",
    "versao": "varchar",
    "camera": "varchar",
    "impressora": "varchar",
    "lastDate": "datetime",
    "status": "varchar",
    "panicCard": "bit",
    "dateLastLog": "datetime",
    "dateLastOnline": "datetime",
    "isCurrentlyOnline": "bit",
    "disableAntiPassback": "bit",
    "disableUsb": "bit",
    "keepUserImages": "bit",
    "ResetCount": "int",
    "parentDeviceId": "bigint",
    "entryChildDeviceId": "bigint",
    "maskDetectionEnabled": "int",
    "identificationDistance": "bigint",
    "ledIntensity": "bigint",
    "ledActivationThreshold": "int",
    "sameFaceDetectionInterval": "bigint",
    "limitIdentificationArea": "bit",
    "strictLiveness": "bit",
    "vehicleDetection": "bit",
    "rtspPort": "int",
    "rtspUsername": "varchar",
    "rtspPassword": "varchar",
    "rtspCamera": "int",
    "onvifPort": "int",
    "rtspVideoWidth": "int",
    "rtspVideoHeight": "int",
    "rtspCodec": "varchar",
    "inputMode": "int",
    "idfaceCount": "int",
    "idfacePrimaryEntry": "bit",
    "hasBio": "bit",
    "idLastLogContingency": "bigint",
    "language": "varchar",
    "lastNsr": "int",
    "operationModeVisitor": "int",
    "idIdentificationMode": "bigint",
    "coluna1": "int"
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

        const query = `UPDATE dbo.Devices SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Devices não encontrado(a) para atualização.' });
        }
        res.status(200).json(result.recordset[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE
exports.deleteDevices = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise();
        const request = pool.request();
        const query = `DELETE FROM dbo.Devices OUTPUT DELETED.id WHERE id = @id;`;
        request.input('id', sql.BigInt, id);
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Devices não encontrado(a) para deletar.' });
        }

        res.status(200).json({ message: `${modelName} com ID ${result.recordset[0].id} foi deletado(a).` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
