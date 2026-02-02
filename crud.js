const findDuplicate = async (data, pool) => {
    const client = await pool.connect();
    const { rfc, ejercicio, mes } = data;
    const insertText = `SELECT * FROM balanzas WHERE rfc=$1 AND ejercicio=$2 AND mes=$3`;
    const values = [rfc, ejercicio, mes];
    try {
        const result = await client.query(insertText, values);
        if (result.rows.length > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log(error)
    }
}


async function getClients(req, res, pool) {
    try {
        const result = await pool.query('SELECT * FROM clientes ORDER BY rfc ASC LIMIT 100');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo clientes' });
    }
}

const saveBalanzaToDB = async (result, req, res, pool) => {
    console.log(req.body);
    let isDuplicate = await findDuplicate({ rfc: req.body.rfc, ejercicio: req.body.ejercicio, mes: req.body.mes }, pool);
    if (isDuplicate) {
        res.json({ message: 'Ya existe una balanza para este cliente, ejercicio y mes' });
        return;
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const insertText = `
        INSERT INTO balanzas (
          rfc, mes, ejercicio, cuenta, nombre,
          saldo_inicial_deudor, saldo_inicial_acreedor,
          cargos, abonos, saldo_final_deudor, saldo_final_acreedor
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
      `;
        for (const row of result['Balanza de Comprobación']) {
            if (row.cuenta == ' ' || row.cuenta == undefined) {
                break;
            }
            const values = [
                req.body.rfc,
                Number(req.body.mes),
                Number(req.body.ejercicio),
                row.cuenta,
                row.nombre,
                row.saldo_inicial_deudor !== ' ' ? row.saldo_inicial_deudor : 0,
                row.saldo_inicial_acreedor !== ' ' ? row.saldo_inicial_acreedor : 0,
                row.cargos !== ' ' ? row.cargos : 0,
                row.abonos !== ' ' ? row.abonos : 0,
                row.saldo_final_deudor !== ' ' ? row.saldo_final_deudor : 0,
                row.saldo_final_acreedor !== ' ' ? row.saldo_final_acreedor : 0
            ];
            await client.query(insertText, values);
        }
        await client.query('COMMIT');
        res.json({ message: 'Archivo procesado y datos guardados correctamente', rows: result['Balanza de Comprobación'].length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Error al guardar en base de datos' });
    } finally {
        client.release();
    }
}

module.exports = { saveBalanzaToDB, findDuplicate, getClients };