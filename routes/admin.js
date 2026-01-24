const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');
const { isAdmin, isManager } = require('../middleware/auth');
const { uploadTourImages } = require('../middleware/upload');
const validationRules = require('../middleware/validation');

// Dashboard routes
router.get('/dashboard', isAdmin, adminController.getDashboard);

// Tour Management
router.get('/tours', isManager, adminController.getTours);
router.get('/tours/create', isManager, adminController.createTourForm);
router.post('/tours/create', isManager, uploadTourImages.array('images', 10), validationRules.createTour, adminController.createTour);
router.get('/tours/:id/edit', isManager, adminController.editTourForm);
router.post('/tours/:id/edit', isManager, uploadTourImages.array('images', 10), validationRules.createTour, adminController.updateTour);
router.post('/tours/:id/delete', isManager, adminController.deleteTour);
router.post('/tours/:id/status', isManager, adminController.updateTourStatus);

// Booking Management
router.get('/bookings', isManager, adminController.getBookings);
router.get('/bookings/:id', isManager, adminController.getBookingDetails);
router.post('/bookings/:id/confirm', isManager, adminController.confirmBooking);
router.post('/bookings/:id/cancel', isManager, adminController.cancelBooking);
router.get('/bookings/calendar', isManager, adminController.getBookingCalendar);

// User Management (Admin only)
router.get('/users', isAdmin, adminController.getUsers);
router.post('/users/:id/role', isAdmin, adminController.updateUserRole);
router.post('/users/:id/status', isAdmin, adminController.updateUserStatus);

// // Analytics
// router.get('/analytics', isAdmin, adminController.getAnalytics);
// router.get('/analytics/revenue', isAdmin, adminController.getRevenueAnalytics);
// router.get('/analytics/popular-tours', isAdmin, adminController.getPopularTours);

// Analytics Dashboard
router.get('/analytics', isAdmin, analyticsController.getAnalytics);
router.get('/analytics/revenue', isAdmin, analyticsController.getRevenueAnalytics);
router.get('/analytics/customers', isAdmin, analyticsController.getCustomerAnalytics);
router.get('/analytics/tours', isAdmin, analyticsController.getTourAnalytics);
router.get('/analytics/realtime', isAdmin, analyticsController.getRealtimeAnalytics);
router.get('/analytics/export', isAdmin, analyticsController.exportAnalytics);

// Additional analytics endpoints (optional APIs)
router.get('/api/analytics/kpis', isAdmin, async (req, res) => {
    try {
        const moment = require('moment');
        const startDate = moment().startOf('month').toDate();
        const endDate = moment().endOf('month').toDate();
        
        const kpis = await getKPIStats(startDate, endDate, 
            moment().subtract(1, 'month').startOf('month').toDate(),
            moment().subtract(1, 'month').endOf('month').toDate()
        );
        
        res.json({ success: true, data: kpis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Settings
router.get('/settings/amenities', isManager, adminController.manageAmenities);
router.post('/settings/amenities', isManager, adminController.createAmenity);
router.get('/settings/categories', isManager, adminController.manageCategories);
router.post('/settings/categories', isManager, adminController.createCategory);
router.get('/settings/system', isAdmin, (req, res) => {
    res.render('admin/settings/system', {
        title: 'System Settings - Casalinga Tours'
    });
});

// Reports
router.get('/reports/bookings', isManager, async (req, res) => {
    try {
        const { start_date, end_date, format = 'html' } = req.query;
        
        const bookings = await db.query(
            `SELECT 
                b.*,
                t.title,
                u.name as customer_name
             FROM bookings b
             JOIN tours t ON b.tour_id = t.id
             JOIN users u ON b.user_id = u.id
             WHERE ($1::date IS NULL OR DATE(b.booked_at) >= $1)
               AND ($2::date IS NULL OR DATE(b.booked_at) <= $2)
             ORDER BY b.booked_at DESC`,
            [start_date || null, end_date || null]
        );

        if (format === 'csv') {
            // Generate CSV
            const csv = bookings.rows.map(booking => 
                `${booking.booking_number},${booking.customer_name},${booking.title},${booking.total_price},${booking.status},${new Date(booking.booked_at).toISOString()}`
            ).join('\n');

            res.header('Content-Type', 'text/csv');
            res.attachment('bookings-report.csv');
            return res.send(csv);
        }

        res.render('admin/reports/bookings', {
            title: 'Bookings Report - Casalinga Tours',
            bookings: bookings.rows,
            filters: { start_date, end_date }
        });
    } catch (error) {
        console.error('Reports error:', error);
        res.status(500).render('error/500', { title: 'Server Error' });
    }
});

module.exports = router;