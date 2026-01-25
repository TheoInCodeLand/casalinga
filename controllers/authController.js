const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../config/email');
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

            if (!user.email_verified) {
                req.session.error = 'Please verify your email address before logging in.';
                return res.redirect('/auth/login');
            }

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
            const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                req.session.error = 'Email already registered';
                return res.redirect('/auth/register');
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Generate Verification Token
            const verificationToken = crypto.randomBytes(32).toString('hex');

            // Create user (email_verified defaults to FALSE in your setup.sql)
            // Storing the RAW token for simplicity, or you can hash it like the password reset flow
            await db.query(
                `INSERT INTO users (name, email, password_hash, phone, role, verification_token) 
                 VALUES ($1, $2, $3, $4, 'user', $5)`,
                [name, email, passwordHash, phone, verificationToken]
            );

            // Send Email
            await sendVerificationEmail(email, verificationToken);

            // DO NOT set req.session.user (No Auto-Login)
            req.session.success = 'Registration successful! Please check your email to verify your account.';
            res.redirect('/auth/login');

        } catch (error) {
            console.error('Registration error:', error);
            req.session.error = 'An error occurred during registration';
            res.redirect('/auth/register');
        }
    },

    // Verify Email Method
    verifyEmail: async (req, res) => {
        try {
            const { token } = req.params;

            // Find user with this token
            const userQuery = await db.query(
                'SELECT id FROM users WHERE verification_token = $1',
                [token]
            );

            if (userQuery.rows.length === 0) {
                req.session.error = 'Invalid or expired verification link.';
                return res.redirect('/auth/login');
            }

            // Activate user and clear token
            await db.query(
                `UPDATE users 
                 SET email_verified = true, verification_token = NULL 
                 WHERE id = $1`,
                [userQuery.rows[0].id]
            );

            req.session.success = 'Email verified! You can now log in.';
            res.redirect('/auth/login');

        } catch (error) {
            console.error('Verification error:', error);
            req.session.error = 'Verification failed.';
            res.redirect('/auth/login');
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

            const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            
            // Security: Always say "If that email exists..." to prevent email scraping
            if (user.rows.length === 0) {
                req.session.success = 'If an account with that email exists, we sent a link.';
                return res.redirect('/auth/forgot-password');
            }

            // Generate Token
            const resetToken = crypto.randomBytes(32).toString('hex');
            
            // Hash token for database storage (Security Best Practice)
            const tokenHash = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');

            // Save Hash + Expiry (1 hour from now)
            await db.query(
                `UPDATE users 
                 SET reset_token_hash = $1, reset_token_expiry = NOW() + INTERVAL '1 hour'
                 WHERE email = $2`,
                [tokenHash, email]
            );

            // Send Email with RAW token
            await sendResetPasswordEmail(email, resetToken);

            req.session.success = 'If an account with that email exists, we sent a link.';
            res.redirect('/auth/forgot-password');

        } catch (error) {
            console.error('Forgot password error:', error);
            req.session.error = 'Something went wrong. Please try again.';
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
            const { token } = req.params; // From URL
            const { password } = req.body; // From Form

            // Hash the token from the URL to compare with DB
            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // Find user with this token AND make sure it hasn't expired
            const user = await db.query(
                `SELECT * FROM users 
                 WHERE reset_token_hash = $1 
                 AND reset_token_expiry > NOW()`,
                [tokenHash]
            );

            if (user.rows.length === 0) {
                req.session.error = 'Password reset token is invalid or has expired.';
                return res.redirect('/auth/forgot-password');
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Update Password & Clear Token
            await db.query(
                `UPDATE users 
                 SET password_hash = $1, reset_token_hash = NULL, reset_token_expiry = NULL 
                 WHERE id = $2`,
                [passwordHash, user.rows[0].id]
            );

            req.session.success = 'Password reset successful! Please login.';
            res.redirect('/auth/login');

        } catch (error) {
            console.error('Reset password error:', error);
            req.session.error = 'Failed to reset password.';
            res.redirect(`/auth/reset-password/${req.params.token}`);
        }
    }
};

module.exports = authController;