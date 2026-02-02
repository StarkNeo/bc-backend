const express = require('express');
const passport = require('passport');
const {resetPassword, login, authStatus, logout, setup2FA, verify2FA, reset2FA, verify2FASetup} = require('../controllers/authController');
const router = express.Router();

//Registration Route
router.post('/reset-password',resetPassword);
//Login Route
//router.post('/login',passport.authenticate('local'),login);
router.post('/login',login);

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

/*
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query('SELECT * FROM usuarios WHERE email=$1', [email]);
  const user = result.rows[0];

  if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ message: 'Contraseña incorrecta' });

  // Generar código 2FA temporal
  const token2FA = speakeasy.totp({
    secret: user.twofa_secret,
    encoding: 'base32'
  });

  console.log('Código 2FA:', token2FA); // En producción se envía por SMS/email

  return res.json({ message: 'Código enviado', userId: user.id });
});

router.post('/verify-2fa', async (req, res) => {
  const { userId, code } = req.body;

  const result = await pool.query('SELECT * FROM usuarios WHERE id=$1', [userId]);
  const user = result.rows[0];

  const verified = speakeasy.totp.verify({
    secret: user.twofa_secret,
    encoding: 'base32',
    token: code,
    window: 1
  });

  if (!verified) return res.status(400).json({ message: 'Código incorrecto' });

  const token = jwt.sign({ id: user.id }, 'SECRET_KEY', { expiresIn: '1h' });

  return res.json({ message: 'Autenticado', token });
});*/

module.exports = router;