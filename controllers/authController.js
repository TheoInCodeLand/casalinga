const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

const authController = {
    // GET /auth/login
    showLoginForm: (req, res) => {
        if (req.session.user) {
            return res.redirect('/user/dashboard');
        }
        res.render('auth/login', {
            title: 'Login - Casalinga Tours',
            layout: 'layouts/auth-layout'
        });
    },

    // POST /auth/login
    login: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                req.session.error = errors.array()[0].msg;
                return res.redirect('/auth/login');
            }

            const { email, password } = req.body;

            // Find user
            const userQuery = await db.query(
                'SELECT * FROM users WHERE email = $1 AND is_active = true',
                [email]
            );

            if (userQuery.rows.length === 0) {
                req.session.error = 'Invalid email or password';
                return res.redirect('/auth/login');
            }

            const user = userQuery.rows[0];

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                req.session.error = 'Invalid email or password';
                return res.redirect('/auth/login');
            }

            // Set session
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar_url
            };

            // Update last login
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            // Redirect based on role
            if (user.role === 'admin' || user.role === 'manager') {
                req.session.success = 'Welcome back!';
                return res.redirect('/admin/dashboard');
            }

            req.session.success = 'Login successful!';
            res.redirect('/user/dashboard');

        } catch (error) {
            console.error('Login error:', error);
            req.session.error = 'An error occurred during login';
            res.redirect('/auth/login');
        }
    },

    // GET /auth/register
    showRegisterForm: (req, res) => {
        if (req.session.user) {
            return res.redirect('/user/dashboard');
        }
        res.render('auth/register', {
            title: 'Register - Casalinga Tours',
            layout: 'layouts/auth-layout'
        });
    },

    // POST /auth/register
    register: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                req.session.error = errors.array()[0].msg;
                return res.redirect('/auth/register');
            }

            const { name, email, password, phone } = req.body;

            // Check if user exists
            const existingUser = await db.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                req.session.error = 'Email already registered';
                return res.redirect('/auth/register');
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Create user
            const newUser = await db.query(
                `INSERT INTO users (name, email, password_hash, phone, role) 
                 VALUES ($1, $2, $3, $4, 'user') 
                 RETURNING id, name, email, role`,
                [name, email, passwordHash, phone]
            );

            // Auto login after registration
            req.session.user = {
                id: newUser.rows[0].id,
                name: newUser.rows[0].name,
                email: newUser.rows[0].email,
                role: newUser.rows[0].role
            };

            req.session.success = 'Registration successful! Welcome to Casalinga Tours';
            res.redirect('/user/dashboard');

        } catch (error) {
            console.error('Registration error:', error);
            req.session.error = 'An error occurred during registration';
            res.redirect('/auth/register');
        }
    },

    // GET /auth/logout
    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            res.redirect('/');
        });
    },

    // GET /auth/forgot-password
    showForgotPasswordForm: (req, res) => {
        res.render('auth/forgot-password', {
            title: 'Forgot Password',
            layout: 'layouts/auth-layout'
        });
    },

    // POST /auth/forgot-password
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;

            const userQuery = await db.query(
                'SELECT id, name FROM users WHERE email = $1 AND is_active = true',
                [email]
            );

            if (userQuery.rows.length === 0) {
                // Don't reveal that user doesn't exist
                req.session.success = 'If your email exists, you will receive a reset link';
                return res.redirect('/auth/login');
            }

            const user = userQuery.rows[0];
            
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');

            // Set token expiry (1 hour)
            const tokenExpiry = new Date(Date.now() + 3600000);

            await db.query(
                `UPDATE users 
                 SET reset_token_hash = $1, reset_token_expiry = $2 
                 WHERE id = $3`,
                [resetTokenHash, tokenExpiry, user.id]
            );

            // In production, send email here
            console.log('Reset token:', resetToken);
            console.log(`Password reset link: /auth/reset-password/${resetToken}`);

            req.session.success = 'Password reset link has been sent to your email';
            res.redirect('/auth/login');

        } catch (error) {
            console.error('Forgot password error:', error);
            req.session.error = 'An error occurred';
            res.redirect('/auth/forgot-password');
        }
    },

    // GET /auth/reset-password/:token
    showResetPasswordForm: async (req, res) => {
        try {
            const { token } = req.params;
            
            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const userQuery = await db.query(
                `SELECT id FROM users 
                 WHERE reset_token_hash = $1 
                 AND reset_token_expiry > NOW()`,
                [tokenHash]
            );

            if (userQuery.rows.length === 0) {
                req.session.error = 'Invalid or expired reset token';
                return res.redirect('/auth/forgot-password');
            }

            res.render('auth/reset-password', {
                title: 'Reset Password',
                layout: 'layouts/auth-layout',
                token
            });

        } catch (error) {
            console.error('Reset password form error:', error);
            req.session.error = 'An error occurred';
            res.redirect('/auth/forgot-password');
        }
    },

    // POST /auth/reset-password/:token
    resetPassword: async (req, res) => {
        try {
            const { token } = req.params;
            const { password } = req.body;

            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // Find user with valid token
            const userQuery = await db.query(
                `SELECT id FROM users 
                 WHERE reset_token_hash = $1 
                 AND reset_token_expiry > NOW()`,
                [tokenHash]
            );

            if (userQuery.rows.length === 0) {
                req.session.error = 'Invalid or expired reset token';
                return res.redirect('/auth/forgot-password');
            }

            const userId = userQuery.rows[0].id;

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Update password and clear reset token
            await db.query(
                `UPDATE users 
                 SET password_hash = $1, 
                     reset_token_hash = NULL, 
                     reset_token_expiry = NULL,
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2`,
                [passwordHash, userId]
            );

            req.session.success = 'Password reset successful. Please login with your new password';
            res.redirect('/auth/login');

        } catch (error) {
            console.error('Reset password error:', error);
            req.session.error = 'An error occurred';
            res.redirect('/auth/forgot-password');
        }
    }
};

module.exports = authController;