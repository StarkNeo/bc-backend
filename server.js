const express = require('express');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const pool = require('./config/db');
const excelToJson = require('convert-excel-to-json');
const crud = require('./crud');
const authRoutes = require('./routes/auth.js');
const passportConfig = require('./config/passportConfig');
const { authStatus } = require('./controllers/authController');


dotenv.config();
passportConfig(passport)
const app = express();
/*const corsOptions = {
    origin: [`http://${process.env.HOST}:5173`],
    credentials:true,
    optionsSuccessStatus: 200
};*/
app.use(cors());
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hora
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/auth', authRoutes);
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload-excel', upload.single('file'), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Obtener token del encabezado
    if (!token) {
        return res.status(401).json({ authenticated: false });
    }
    const authResult = await authStatus(token);
    console.log(authResult)
    if (!authResult) {
        return res.status(401).json({ authenticated: false, message: 'Token inválido o expirado' });
    }

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Sin documento' });
        }

        const result = excelToJson(
            {
                source: req.file.buffer,
                /*header: { rows: 7 },
                
                columnToKey: {
                    A: 'cuenta',
                    B: 'nombre',
                    C: 'saldo_inicial_deudor',
                    D: 'saldo_inicial_acreedor',
                    E: 'cargos',
                    F: 'abonos',
                    G: 'saldo_final_deudor',
                    H: 'saldo_final_acreedor'
                }*/
            }
        )
        //Validar Estrucura del Excel
        let hasKeyBalanza = Object.keys(result).includes('Balanza de Comprobación');
        if (!hasKeyBalanza) {
            return res.status(400).json({ message: 'Fallo estructura Excel' });
        }
        let hasMaxColumns = Math.max(...result['Balanza de Comprobación'].map(row => Object.keys(row).length)) >= 8;
        if (!hasKeyBalanza || !hasMaxColumns) {
            return res.status(400).json({ message: 'Fallo estructura Excel' });
        }

        const objectsFiltered = result['Balanza de Comprobación'].filter(row => {
            let columnA = row.A ? row.A.trim() : '';
            if (columnA !== '') {
                return columnA.includes('-');
            }
        })

        const objectsFilteredMapped = objectsFiltered.map((row) => {
            row.cuenta = row.A;
            delete row.A;
            row.nombre = row.B ? row.B.trim() : '';
            delete row.B;
            row.saldo_inicial_deudor = row.C ? Number(row.C) : 0;
            delete row.C;
            row.saldo_inicial_acreedor = row.D ? Number(row.D) : 0;
            delete row.D;
            row.cargos = row.E ? Number(row.E) : 0;
            delete row.E;
            row.abonos = row.F ? Number(row.F) : 0;
            delete row.F;
            row.saldo_final_deudor = row.G ? Number(row.G) : 0;
            delete row.G;
            row.saldo_final_acreedor = row.H ? Number(row.H) : 0;
            delete row.H;
            return row;
        });
        await crud.saveBalanzaToDB(objectsFilteredMapped, req, res, pool);


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al procesar' });
    }
});

app.get('/balanzas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM balanzas ORDER BY id DESC LIMIT 100');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo balanzas' });
    }
});

app.get('/clientes', async (req, res) => {
    try {
        crud.getClients(req, res, pool);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo clientes' });
    }
});

app.get('/balanzas-pending', async (req, res) => {
    try {
        crud.getBalanzasPending(req, res, pool);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo balanzas pendientes' });
    }
});



const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Backend escuchando`);
});
