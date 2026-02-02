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


dotenv.config();
passportConfig(passport)
const app = express();
const corsOptions = {
    origin: [`http://${process.env.HOST}:5173`],
    credentials:true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
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
    console.log(req.file);
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se envió archivo' });
        }
        const result = excelToJson(
            {
                source: req.file.buffer,
                header: { rows: 7 },
                columnToKey: {
                    A: 'cuenta',
                    B: 'nombre',
                    C: 'saldo_inicial_deudor',
                    D: 'saldo_inicial_acreedor',
                    E: 'cargos',
                    F: 'abonos',
                    G: 'saldo_final_deudor',
                    H: 'saldo_final_acreedor'
                }
            }
        )
       
        await crud.saveBalanzaToDB(result, req, res, pool);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error procesando el archivo' });
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



const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Backend escuchando en http://localhost:${PORT}`);
});
