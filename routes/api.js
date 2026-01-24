const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { isAuthenticated } = require('../middleware/auth');
const { check } = require('express-validator');
const tourController = require('../controllers/tourController');
const chatController = require('../controllers/chatController');
const db = require('../config/database');

// Public API endpoints
router.get('/tours', apiController.getTours);
router.get('/tours/:id', apiController.getTour);
router.get('/categories', apiController.getCategories);
router.get('/amenities', tourController.getAmenities);
router.get('/stats', apiController.getStats);
router.get('/availability/:tour_id', apiController.checkAvailability);

// Protected API endpoints
router.post('/bookings', [
    check('user_email').isEmail().withMessage('Valid email is required'),
    check('tour_date').isISO8601().withMessage('Valid date is required'),
    check('people_count').isInt({ min: 1, max: 20 }).withMessage('People count must be between 1 and 20')
], apiController.createBooking);

router.get('/bookings/:booking_number', apiController.getBooking);
router.post('/chat', chatController.handleChat);
// Contact form
router.post('/contact', [
    check('name').notEmpty().withMessage('Name is required'),
    check('email').isEmail().withMessage('Valid email is required'),
    check('message').notEmpty().withMessage('Message is required')
], apiController.sendContactMessage);

// Webhook for payments (example for PayFast)
router.post('/webhooks/payfast', async (req, res) => {
    try {
        const { payment_status, booking_number, amount } = req.body;
        
        if (payment_status === 'COMPLETE') {
            await db.query(
                `UPDATE bookings 
                 SET payment_status = 'paid', payment_method = 'payfast'
                 WHERE booking_number = $1`,
                [booking_number]
            );
            
            // Send confirmation email
            console.log(`Payment received for booking ${booking_number}`);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error');
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;