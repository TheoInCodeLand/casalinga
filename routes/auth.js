const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validationRules = require('../middleware/validation');
const { check } = require('express-validator');

// Login routes
router.get('/login', authController.showLoginForm);
router.post('/login', validationRules.login, authController.login);

// Register routes
router.get('/register', authController.showRegisterForm);
router.post('/register', validationRules.register, authController.register);

// Logout route
router.get('/logout', authController.logout);

// Password reset routes
router.get('/forgot-password', authController.showForgotPasswordForm);
router.post('/forgot-password', [
    check('email').isEmail().withMessage('Valid email is required')
], authController.forgotPassword);

router.get('/reset-password/:token', authController.showResetPasswordForm);
router.post('/reset-password/:token', [
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    check('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    })
], authController.resetPassword);

module.exports = router;