const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { isAuthenticated } = require('../middleware/auth');
const validationRules = require('../middleware/validation');

// Create booking
router.post('/create', isAuthenticated, validationRules.createBooking, bookingController.createBooking);
// GET /bookings/:id/ticket
router.get('/:id/ticket', isAuthenticated, bookingController.downloadTicket);
// Check availability API
router.post('/check-availability', bookingController.checkAvailability);

// User booking management
router.get('/my-bookings', isAuthenticated, bookingController.getUserBookings);
router.get('/:id', isAuthenticated, bookingController.getBookingDetails);
router.post('/:id/cancel', isAuthenticated, bookingController.cancelBooking);

// API endpoints for external integrations
router.get('/api/booking/:booking_number', async (req, res) => {
    try {
        const { booking_number } = req.params;
        
        const booking = await db.query(
            `SELECT 
                b.*,
                t.title, t.location,
                u.name as user_name
             FROM bookings b
             JOIN tours t ON b.tour_id = t.id
             JOIN users u ON b.user_id = u.id
             WHERE b.booking_number = $1`,
            [booking_number]
        );

        if (booking.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({
            success: true,
            data: booking.rows[0]
        });
    } catch (error) {
        console.error('API booking error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;