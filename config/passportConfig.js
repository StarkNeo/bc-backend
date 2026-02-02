// config/passportConfig.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('../config/db');

module.exports = function (passport) {

  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const result = await pool.query(
            'SELECT * FROM usuarios WHERE email=$1',
            [email]
          );

          const user = result.rows[0];

          if (!user) return done(null, false, { message: 'Usuario no encontrado' });

          const valid = await bcrypt.compare(password, user.password_hash);
          if (!valid) return done(null, false, { message: 'Contraseña incorrecta' });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE id=$1',
        [id]
      );
      done(null, result.rows[0]);
    } catch (err) {
      done(err);
    }
  });
};