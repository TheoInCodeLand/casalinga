const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const { isAuthenticated } = require('../middleware/auth');

// Public tour routes
router.get('/', tourController.getAllTours);
router.get('/search', tourController.searchTours);
router.get('/category/:category', tourController.getToursByCategory);
router.get('/:slug', tourController.getTourDetails);

// API endpoints for data
router.get('/api/amenities', tourController.getAmenities);
router.get('/api/categories', tourController.getCategories);
router.get('/api/available-dates/:tourId', tourController.getAvailableDates);

// Authenticated routes
router.post('/:id/favorite', isAuthenticated, tourController.toggleFavorite);

// Booking routes (connected to tour details)
router.post('/:slug/book', isAuthenticated, async (req, res) => {
    // This will redirect to booking controller
    // Implemented in booking routes
    res.redirect(`/bookings/create?tour=${req.params.slug}`);
});

module.exports = router;