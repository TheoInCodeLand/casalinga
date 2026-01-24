const express = require('express');
const router = express.Router();
const db = require('../config/database');
const tourController = require('../controllers/tourController');

// routes/index.js

router.get('/', async (req, res) => {
    try {
        // Updated query to fetch Category Name as 'primary_tag'
        const featuredTours = await db.query(
            `SELECT 
                t.id, t.title, t.slug, t.short_description, 
                t.location, t.price, t.discount_price,
                t.start_date, t.duration_days, t.featured,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image,
                (SELECT c.name FROM categories c 
                 JOIN tour_categories tc ON c.id = tc.category_id 
                 WHERE tc.tour_id = t.id 
                 LIMIT 1) as primary_tag
             FROM tours t
             WHERE t.featured = true AND t.status IN ('upcoming', 'available')
             ORDER BY t.created_at DESC
             LIMIT 6`
        );

        const categories = await db.query(
            'SELECT id, name, icon FROM categories ORDER BY name LIMIT 6'
        );

        // Calculate stats for the hero section
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as happy_travelers,
                (SELECT COUNT(*) FROM tours WHERE status = 'available') as active_tours
        `);

        res.render('index', {
            title: 'Casalinga Tours | Discover Wellness Through Travel',
            featuredTours: featuredTours.rows,
            categories: categories.rows,
            stats: {
                travelers: stats.rows[0]?.happy_travelers || 500,
                tours: stats.rows[0]?.active_tours || 50
            }
        });
    } catch (error) {
        console.error('Home page error:', error);
        res.status(500).render('error/500', { title: 'Server Error' });
    }
});

router.get('/vlog', (req, res) => {
    res.render('vlog', { 
        title: 'My Vlog Page',
        videoUrl: '/videos/my-tour.mp4',
        posterUrl: '/images/thumbnail.jpg' 
    });
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