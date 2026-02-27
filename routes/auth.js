const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { resetPassword, login, authStatus, logout, setup2FA, verify2FA, reset2FA, verify2FASetup } = require('../controllers/authController');
const router = express.Router();
const FormData = require('form-data');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de tamaño de archivo a 10MB
}); // Configuración de multer para recibir archivos multiform-data

const URL_MICROSERVICE = process.env.URL_MICROSERVICE; // Cambia a URL_MICROSERVICE para producción

//Registration Route
router.post('/reset-password', resetPassword);
//Login Route
router.post('/login', login);

//Get user authentication status
router.post('/check-auth', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Obtener token del encabezado
  if (!token) {
    return res.json({ authenticated: false });

  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //res.status(200).json({ authenticated: true, user: decoded['nombre'] });
    res.status(200).json({ authenticated: true })
  } catch (error) {
    res.status(401).json({ authenticated: false, message: 'Token inválido' });
  }

});

//Auth Status Route
//router.get('/status', authStatus);
// Logout Route
router.post('/logout', logout);

//Se accesa a las siguientes rutas solo si el usuario está autenticado
// 2FA Setup Route
router.get('/setup-2fa', setup2FA);

router.post('/verify-2fa-setup', verify2FASetup);

// 2FA Verification Route
router.post('/verify-2fa', verify2FA);

// Reset Route

router.post('/2fa-reset', reset2FA);

// Get cumplimiento data from the backend-cumplimiento microservice
router.get('/cumplimiento', async (req, res) => {
  try {
    const response = await fetch(`${process.env.URL_MICROSERVICE}/cumplimiento`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching cumplimiento data:', error);
    res.status(500).json({ error: 'Error fetching cumplimiento data' });
  }
});

// Upload cumplimiento file
router.post('/upload', upload.array('file', 10), async (req, res) => {
  try {
    // Validar token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Validar archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log("FILES EN GATEWAY:",
      req.files.map(f => ({
        name: f.originalname,
        size: f.size
      }))
    );

    //Reconstruir FormData
    const formData = new FormData();

    for (const file of req.files) {
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
    }

    // Enviar al microservicio
    const response = await axios.post(
      `${URL_MICROSERVICE}/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    // Responder al cliente
    return res.status(200).json({
      message: 'Files uploaded successfully',
      microserviceResponse: response.data
    });

  } catch (error) {
    console.error("ERROR EN GATEWAY:",
      error.response?.data || error.message
    );

    return res.status(
      error.response?.status || 500
    ).json({
      error: error.response?.data || 'Error uploading files'
    });
  }
});



module.exports = router;