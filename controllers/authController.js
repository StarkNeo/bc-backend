const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrCode = require('qrcode');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const passport = require('passport');
const validation = require('./fieldsValidation');
const e = require('express');

const resetPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const passwordvalidation = validation.validatePassword(newPassword);

        if (!passwordvalidation) {
            return res.status(400).json({ message: 'Contraseña no válida' });
        }        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await pool.query('UPDATE usuarios SET password_hash=$1, must_change_password=$2 WHERE id=$3 RETURNING id', [hashedPassword, false, userId]);
        return res.status(201).json({ message: 'Contraseña actualizada exitosamente', userId: result.rows[0].id });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error en el registro' });
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const passwordValidation = validation.validatePassword(password);
        const emailValidation = validation.validateEmail(email);
        

        if (!emailValidation || !passwordValidation) {
            if (!emailValidation) {
                return res.status(400).json({ message: 'Usuario no válido' });
            }
            if (!passwordValidation) {
                return res.status(400).json({ message: 'Contraseña no válida' });
            }
        }
        // Buscar usuario en la base de datos
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE email=$1', [email]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }
        const user = rows[0];

        //Si usuario existe pero debe actualizar su password o no tiene password_hash
        if (user.must_change_password) {
            return res.json({
                message: 'El usuario requiere actualizar su contraseña.',
                requiresPasswordReset: true,
                userId: user.id,
                email: email
            });
        }
        // Verificar contraseña
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }
        // Revisar si usuario tiene 2FA habilitado
        if (!user.is_twofa_enabled) {
            return res.json({
                message: 'Login exitoso, 2FA no habilitado',
                userId: user.id,
                requires2FASetup: true
            });
        }
        // Si 2FA está habilitado, pedir codigo TOTP
        return res.json({
            message: 'Se requiere 2FA',
            userId: user.id,
            requires2FA: true
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el login' });
    }
   
};




const authStatus = async (req, res) => {
    try {
        if (req.user) {
            return res.json(
                {
                    authenticated: true,
                    user: req.user.email,
                    isMfaEnabled: req.user.is_twofa_enabled
                });
        } else {
            return res.json({ authenticated: false });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error verificando estado de autenticación' });
    }
};
const logout = async (req, res) => {
    try {
        // 1. Cerrar sesión de Passport
        req.logout(err => {
            if (err) {
                console.error("Error en logout:", err);
                return res.status(500).json({ message: "Error cerrando sesión" });
            }

            // 2. Destruir la sesión del servidor
            req.session.destroy(err => {
                if (err) {
                    console.error("Error destruyendo sesión:", err);
                    return res.status(500).json({ message: "Error cerrando sesión" });
                }

                // 3. Respuesta final
                return res.json({ message: "Sesión cerrada correctamente" });
            });
        });

    } catch (error) {
        console.error("Error en logout:", error);
        res.status(500).json({ message: "Error cerrando sesión" });
    }

};


const setup2FA = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "Falta userId" });
        }

        // 1. Obtener usuario
        const { rows } = await pool.query(
            "SELECT email, is_twofa_enabled, twofa_secret FROM usuarios WHERE id=$1",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const user = rows[0];

        // 2. Si ya tiene 2FA configurado, no generar otro secret
        if (user.is_twofa_enabled && user.twofa_secret) {
            return res.status(400).json({
                message: "El usuario ya tiene 2FA configurado"
            });
        }

        // 3. Generar secret
        const secret = speakeasy.generateSecret({
            name: `BCPortal (${user.email})`,
            length: 20
        });

        // 4. Guardar secret pero NO activar 2FA todavía
        await pool.query(
            "UPDATE usuarios SET twofa_secret=$1 WHERE id=$2",
            [secret.base32, userId]
        );

        // 5. Crear URL otpauth
        const otpauthUrl = secret.otpauth_url;

        // 6. Generar QR
        const qrImageUrl = await qrCode.toDataURL(otpauthUrl);

        return res.json({
            message: "2FA listo para escanear",
            qrImageUrl
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error generando 2FA" });
    }
};

const verify2FASetup = async (req, res) => {
    try {
        const { code, userId } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ message: "Faltan parámetros" });
        };


        //Obtener usuario de la BD
        const { rows } = await pool.query(
            "SELECT twofa_secret FROM usuarios WHERE id=$1",
            [userId]
        );
        const user = rows[0];
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const secret = user.twofa_secret;

        const verified = speakeasy.totp.verify({
            secret,
            encoding: "base32",
            token: code,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ message: "Código incorrecto" });
        }
        //Activar 2FA
        await pool.query(
            "UPDATE usuarios SET is_twofa_enabled=$1 WHERE id=$2",
            [true, userId]
        );
        // GENERAR TOKEN AQUÍ MISMO
        const token = jwt.sign(
            { id: userId, email: user.email, nombre: user.nombre },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            message: "2FA activado correctamente",
            token
        });
        //return res.json({ message: "2FA activado correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error verificando 2FA" });
    }

};

const verify2FA = async (req, res) => {
    try {
        const { userId, code } = req.body;
        if (!userId || !code) {
            return res.status(400).json({ message: 'Faltan parámetros' });
        }

        //Obtener Usuario de la BD
        const result = await pool.query('SELECT * FROM usuarios WHERE id=$1', [userId]);
        const dbUser = result.rows[0];
        if (!dbUser) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }
        //Verificar código TOTP
        const verified = speakeasy.totp.verify({
            secret: dbUser.twofa_secret,
            encoding: 'base32',
            token: code,
            window: 1
        });
        if (!verified) {
            return res.status(400).json({ message: 'Código incorrecto' });
        }

        //Activat 2FA
        await pool.query('UPDATE usuarios SET is_twofa_enabled=$1 WHERE id=$2', [true, userId]);

        //GENERA JWT
        const jwtToken = jwt.sign(
            { id: dbUser.id, email: dbUser.email, nombre: dbUser.nombre },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        return res.json({ message: 'Autenticado', token: jwtToken });
        

    } catch (error) {
        console.log("Error en verificacion: ", error)
        res.status(500).json({ message: 'Error en la verificación de 2FA' });
    }
};

const reset2FA = async (req, res) => {
    const { userId } = req.body;
    try {
        await pool.query('UPDATE usuarios SET twofa_secret=$1, is_twofa_enabled=$2 WHERE id=$3', [null, false, userId]);
        return res.json({ message: '2FA reiniciado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al reiniciar 2FA' });
    }
};

module.exports = { resetPassword, login, authStatus, logout, setup2FA, verify2FA, reset2FA, verify2FASetup };
