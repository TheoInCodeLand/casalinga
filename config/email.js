const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
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

module.exports = {
    sendVerificationEmail
};