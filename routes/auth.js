const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const {resetPassword, login, authStatus, logout, setup2FA, verify2FA, reset2FA, verify2FASetup} = require('../controllers/authController');
const router = express.Router();

//Registration Route
router.post('/reset-password',resetPassword);
//Login Route
router.post('/login',login);

//Get user authentication status
router.post('/check-auth', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Obtener token del encabezado
  if(!token){
    return res.json({ authenticated: false });

  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ authenticated: true, user: decoded['nombre'] });
  } catch (error) {
    res.status(403).json({ authenticated: false, message: 'Token inválido' });
  } 
  
});

//Auth Status Route
router.get('/status', authStatus);
// Logout Route
router.post('/logout', logout);

//Se accesa a las siguientes rutas solo si el usuario está autenticado
// 2FA Setup Route
router.get('/setup-2fa',setup2FA);

router.post('/verify-2fa-setup',verify2FASetup); 

// 2FA Verification Route
router.post('/verify-2fa',verify2FA);

// Reset Route

router.post('/2fa-reset',reset2FA);



module.exports = router;