const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { resetPassword, login, authStatus, logout, setup2FA, verify2FA, reset2FA, verify2FASetup } = require('../controllers/authController');
const router = express.Router();
const dotenv = require('dotenv').config();
const FormData = require('form-data');

const upload = multer(); // Configuración de multer para recibir archivos multiform-data
console.log("dotenv:", dotenv.parsed);
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
  console.log("FILES RECEIVED:", req.files);
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    //Forward files to microservice
    const formData = new FormData();
    for (const file of req.files) {
      formData.append("file", Buffer.from(file.buffer), {filename: file.originalname, contentType: file.mimetype});
    }
    
    console.log("CONTENIDO FORM DATA:", formData);

    const response = await fetch(`${process.env.URL_MICROSERVICE}/upload`, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders()
    });

    //If microservice returns an error, forward that error to the client
    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
        console.error('Error response from microservice:', errorData);
      } catch (jsonError) {
        console.error('Error parsing microservice error response as JSON:', jsonError);
        errorData = { error: 'Unknown error from microservice' };
      }
      return res.status(response.status).json({ error: errorData.error || 'Error processing file in microservice', status: response.status });
    }

    //Parse success JSON
    const result = await response.json();
    console.log('Microservice response:', result);
    res.status(200).json({ message: 'File uploaded successfully', data: result });

  }
  catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error uploading file' });

  }

}
);


module.exports = router;