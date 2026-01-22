const express = require('express');
const router = express.Router();
const db = require('../config/database');
const tourController = require('../controllers/tourController');

// Public routes
router.get('/', async (req, res) => {
    try {
        // Get featured tours
        const featuredTours = await db.query(
            `SELECT 
                t.id, t.title, t.slug, t.short_description, 
                t.location, t.price, t.discount_price,
                t.start_date, t.duration_days,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as image
             FROM tours t
             WHERE t.featured = true AND t.status IN ('upcoming', 'available')
             ORDER BY t.created_at DESC
             LIMIT 6`
        );

        // Get categories for quick filter
        const categories = await db.query(
            'SELECT id, name, icon FROM categories ORDER BY name LIMIT 6'
        );

        res.render('index', {
            title: 'Casalinga Tours - Wellness Through Travel',
            featuredTours: featuredTours.rows,
            categories: categories.rows
        });
    } catch (error) {
        console.error('Home page error:', error);
        res.status(500).render('error/500', { title: 'Server Error' });
    }
});

router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Us - Casalinga Tours'
    });
});

router.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact Us - Casalinga Tours'
    });
});

router.get('/privacy', (req, res) => {
    res.render('public/privacy', {
        title: 'Privacy Policy - Casalinga Tours'
    });
});

router.get('/terms', (req, res) => {
    res.render('public/terms', {
        title: 'Terms & Conditions - Casalinga Tours'
    });
});

// Include tour routes
router.use('/tours', require('./tours'));

module.exports = router;