const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'thobejanetheo@gmail.com',
        pass: 'qpgi bxth clqe ektl'
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false // Helps prevent handshake errors in production
    }
})

const sendVerificationEmail = async (userEmail, token) => {
    // Change this URL to your actual domain in production
    const baseUrl = process.env.BASE_URL || 'http://localhost:5050';
    const verificationLink = `${baseUrl}/auth/verify-email/${token}`;

    const mailOptions = {
        from: `"Casalinga Tours" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Verify your email for Casalinga Tours',
        html: `
            <h3>Welcome to Casalinga Tours!</h3>
            <p>Please verify your email address to activate your account and start booking.</p>
            <a href="${verificationLink}" style="padding: 10px 20px; background-color: #1e6b38; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
            <p>Or click this link: <a href="${verificationLink}">${verificationLink}</a></p>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendResetPasswordEmail = async (userEmail, token) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:8200';
    // The link contains the RAW token (which the user sees)
    const resetLink = `${baseUrl}/auth/reset-password/${token}`;

    const mailOptions = {
        from: `"Casalinga Security" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Password Reset Request',
        html: `
            <h3>Password Reset Request</h3>
            <p>You requested to reset your password. Click the link below to set a new one:</p>
            <a href="${resetLink}" style="padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't ask for this, please ignore this email.</p>
        `
    };

    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail
};