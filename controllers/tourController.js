const db = require('../config/database');
const { validationResult } = require('express-validator');
const moment = require('moment');

const tourController = {
    // GET /tours (Browse all tours)
    getAllTours: async (req, res) => {
        try {
            // 1. Extract 'search' alongside other filters
            const { category, price_min, price_max, date, location, search, page = 1 } = req.query;
            const limit = 12;
            const offset = (page - 1) * limit;

            let query = `
                SELECT 
                    t.id, t.title, t.slug, t.short_description, 
                    t.location, t.price, t.discount_price,
                    t.start_date, t.end_date, t.duration_days,
                    t.capacity, t.booked_count, t.status, t.featured,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
                FROM tours t
                WHERE t.status IN ('upcoming', 'available')
            `;
            
            const queryParams = [];
            let paramCount = 0;

            // --- 2. Add Generic Search Logic (This was missing) ---
            if (search) {
                paramCount++;
                // Search across Title, Description, AND Location
                query += ` AND (t.title ILIKE $${paramCount} OR t.short_description ILIKE $${paramCount} OR t.location ILIKE $${paramCount})`;
                queryParams.push(`%${search}%`);
            }

            // Apply specific filters
            if (category) {
                paramCount++;
                query += ` AND EXISTS (
                    SELECT 1 FROM tour_categories tc 
                    JOIN categories c ON tc.category_id = c.id 
                    WHERE tc.tour_id = t.id AND c.name ILIKE $${paramCount}
                )`;
                queryParams.push(`%${category}%`);
            }

            if (price_min) {
                paramCount++;
                query += ` AND (COALESCE(t.discount_price, t.price) >= $${paramCount})`;
                queryParams.push(price_min);
            }

            if (price_max) {
                paramCount++;
                query += ` AND (COALESCE(t.discount_price, t.price) <= $${paramCount})`;
                queryParams.push(price_max);
            }

            if (date) {
                paramCount++;
                query += ` AND t.start_date >= $${paramCount}`;
                queryParams.push(date);
            }

            if (location) {
                paramCount++;
                query += ` AND t.location ILIKE $${paramCount}`;
                queryParams.push(`%${location}%`);
            }

            // Count total for pagination (wrapping the query to count filtered results)
            const countQuery = `SELECT COUNT(*) FROM (${query}) as filtered`;
            const countResult = await db.query(countQuery, queryParams);
            const totalTours = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalTours / limit);

            // Add ordering and pagination
            query += ` ORDER BY t.featured DESC, t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            queryParams.push(limit, offset);

            const toursResult = await db.query(query, queryParams);
            const tours = toursResult.rows;

            // Get featured tours for sidebar (if needed, though template doesn't use it now)
            // ... (Keep existing sidebar logic if you want) ...

            // Get categories for filter dropdown/buttons
            const categories = await db.query(
                'SELECT id, name, icon FROM categories ORDER BY name'
            );

            res.render('tours/index', {
                title: 'Browse Tours - Casalinga Tours',
                tours,
                categories: categories.rows,
                currentPage: parseInt(page),
                totalPages,
                totalTours,
                // Pass all filters back to the view so pagination keeps them
                filters: {
                    category,
                    price_min,
                    price_max,
                    date,
                    location,
                    search // Pass search back to view
                },
                moment
            });

        } catch (error) {
            console.error('Get tours error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /tours/:slug (Tour details)
    getTourDetails: async (req, res) => {
        try {
            const { slug } = req.params;
            const userId = req.session.user ? req.session.user.id : null;

            // Get tour details
            const tourQuery = await db.query(
                `SELECT 
                    t.*,
                    u.name as created_by_name,
                    u.email as created_by_email
                 FROM tours t
                 LEFT JOIN users u ON t.created_by = u.id
                 WHERE t.slug = $1 AND t.status IN ('upcoming', 'available')`,
                [slug]
            );

            if (tourQuery.rows.length === 0) {
                return res.status(404).render('error/404', { title: 'Tour Not Found' });
            }

            const tour = tourQuery.rows[0];

            // Get tour images
            const imagesQuery = await db.query(
                'SELECT id, image_url, alt_text, is_main FROM tour_images WHERE tour_id = $1 ORDER BY display_order',
                [tour.id]
            );

            // Get amenities
            const amenitiesQuery = await db.query(
                `SELECT a.id, a.name, a.icon, a.description 
                 FROM amenities a
                 JOIN tour_amenities ta ON a.id = ta.amenity_id
                 WHERE ta.tour_id = $1`,
                [tour.id]
            );

            // Get categories
            const categoriesQuery = await db.query(
                `SELECT c.id, c.name, c.icon 
                 FROM categories c
                 JOIN tour_categories tc ON c.id = tc.category_id
                 WHERE tc.tour_id = $1`,
                [tour.id]
            );

            // Check if tour is in user's favorites
            let isFavorite = false;
            if (userId) {
                const favoriteQuery = await db.query(
                    'SELECT 1 FROM favorites WHERE user_id = $1 AND tour_id = $2',
                    [userId, tour.id]
                );
                isFavorite = favoriteQuery.rows.length > 0;
            }

            // Get similar tours (by category)
            const similarToursQuery = await db.query(
                `SELECT DISTINCT t.id, t.title, t.slug, t.short_description, t.price,
                        (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as image
                 FROM tours t
                 JOIN tour_categories tc ON t.id = tc.tour_id
                 WHERE tc.category_id IN (
                     SELECT category_id FROM tour_categories WHERE tour_id = $1
                 ) AND t.id != $1 AND t.status IN ('upcoming', 'available')
                 LIMIT 4`,
                [tour.id]
            );

            res.render('public/tour-details', {
                title: `${tour.title} - Casalinga Tours`,
                tour,
                images: imagesQuery.rows,
                amenities: amenitiesQuery.rows,
                categories: categoriesQuery.rows,
                similarTours: similarToursQuery.rows,
                isFavorite,
                moment
            });

        } catch (error) {
            console.error('Get tour details error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /tours/:id/favorite (Toggle favorite)
    toggleFavorite: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Please login to save favorites' });
            }

            const { id } = req.params;
            const userId = req.session.user.id;

            // Check if already favorited
            const existingQuery = await db.query(
                'SELECT 1 FROM favorites WHERE user_id = $1 AND tour_id = $2',
                [userId, id]
            );

            if (existingQuery.rows.length > 0) {
                // Remove from favorites
                await db.query(
                    'DELETE FROM favorites WHERE user_id = $1 AND tour_id = $2',
                    [userId, id]
                );
                return res.json({ success: true, action: 'removed' });
            } else {
                // Add to favorites
                await db.query(
                    'INSERT INTO favorites (user_id, tour_id) VALUES ($1, $2)',
                    [userId, id]
                );
                return res.json({ success: true, action: 'added' });
            }

        } catch (error) {
            console.error('Toggle favorite error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    },

    // GET /tours/search (Search tours)
    searchTours: async (req, res) => {
        try {
            const { q, location, category, date, min_price, max_price } = req.query;

            let query = `
                SELECT DISTINCT 
                    t.id, t.title, t.slug, t.short_description, 
                    t.location, t.price, t.discount_price,
                    t.start_date, t.duration_days, t.status,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as image
                FROM tours t
                LEFT JOIN tour_categories tc ON t.id = tc.tour_id
                LEFT JOIN categories c ON tc.category_id = c.id
                WHERE t.status IN ('upcoming', 'available')
            `;

            const queryParams = [];
            let paramCount = 0;

            if (q) {
                paramCount++;
                query += ` AND (t.title ILIKE $${paramCount} OR t.short_description ILIKE $${paramCount} OR t.location ILIKE $${paramCount})`;
                queryParams.push(`%${q}%`);
            }

            if (location) {
                paramCount++;
                query += ` AND t.location ILIKE $${paramCount}`;
                queryParams.push(`%${location}%`);
            }

            if (category) {
                paramCount++;
                query += ` AND c.name ILIKE $${paramCount}`;
                queryParams.push(`%${category}%`);
            }

            if (date) {
                paramCount++;
                query += ` AND t.start_date >= $${paramCount}`;
                queryParams.push(date);
            }

            if (min_price) {
                paramCount++;
                query += ` AND (t.discount_price >= $${paramCount} OR t.price >= $${paramCount})`;
                queryParams.push(min_price);
            }

            if (max_price) {
                paramCount++;
                query += ` AND (t.discount_price <= $${paramCount} OR t.price <= $${paramCount})`;
                queryParams.push(max_price);
            }

            query += ' ORDER BY t.created_at DESC LIMIT 20';

            const toursResult = await db.query(query, queryParams);

            res.render('public/tour-search', {
                title: 'Search Tours - Casalinga Tours',
                tours: toursResult.rows,
                searchQuery: q,
                filters: { q, location, category, date, min_price, max_price },
                moment
            });

        } catch (error) {
            console.error('Search tours error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /tours/category/:category
    getToursByCategory: async (req, res) => {
        try {
            const { category } = req.params;
            const { page = 1 } = req.query;
            const limit = 12;
            const offset = (page - 1) * limit;

            const toursQuery = await db.query(
                `SELECT 
                    t.id, t.title, t.slug, t.short_description, 
                    t.location, t.price, t.discount_price,
                    t.start_date, t.duration_days, t.status,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as image
                 FROM tours t
                 JOIN tour_categories tc ON t.id = tc.tour_id
                 JOIN categories c ON tc.category_id = c.id
                 WHERE c.name ILIKE $1 AND t.status IN ('upcoming', 'available')
                 ORDER BY t.created_at DESC
                 LIMIT $2 OFFSET $3`,
                [`%${category}%`, limit, offset]
            );

            const countQuery = await db.query(
                `SELECT COUNT(*) 
                 FROM tours t
                 JOIN tour_categories tc ON t.id = tc.tour_id
                 JOIN categories c ON tc.category_id = c.id
                 WHERE c.name ILIKE $1 AND t.status IN ('upcoming', 'available')`,
                [`%${category}%`]
            );

            const categoryInfo = await db.query(
                'SELECT name, description FROM categories WHERE name ILIKE $1',
                [`%${category}%`]
            );

            const totalTours = parseInt(countQuery.rows[0].count);
            const totalPages = Math.ceil(totalTours / limit);

            res.render('public/tours-category', {
                title: `${category} Tours - Casalinga Tours`,
                tours: toursQuery.rows,
                category: categoryInfo.rows[0] || { name: category },
                currentPage: parseInt(page),
                totalPages,
                totalTours,
                moment
            });

        } catch (error) {
            console.error('Get tours by category error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /api/tours/amenities
    getAmenities: async (req, res) => {
        try {
            const amenities = await db.query(
                'SELECT id, name, icon FROM amenities ORDER BY name'
            );
            res.json({ success: true, amenities: amenities.rows });
        } catch (error) {
            console.error('Get amenities error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    },

    // GET /api/tours/categories
    getCategories: async (req, res) => {
        try {
            const categories = await db.query(
                'SELECT id, name, icon, color FROM categories ORDER BY name'
            );
            res.json({ success: true, categories: categories.rows });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    },

    // GET /api/tours/available-dates/:tourId
    getAvailableDates: async (req, res) => {
        try {
            const { tourId } = req.params;

            const tourQuery = await db.query(
                'SELECT start_date, end_date, capacity, booked_count FROM tours WHERE id = $1',
                [tourId]
            );

            if (tourQuery.rows.length === 0) {
                return res.json({ success: false, message: 'Tour not found' });
            }

            const tour = tourQuery.rows[0];
            const bookedDatesQuery = await db.query(
                `SELECT DATE(booked_at) as date, SUM(people_count) as total_people 
                 FROM bookings 
                 WHERE tour_id = $1 AND status = 'confirmed' 
                 GROUP BY DATE(booked_at)`,
                [tourId]
            );

            const bookedDates = {};
            bookedDatesQuery.rows.forEach(row => {
                bookedDates[row.date] = row.total_people;
            });

            // Generate available dates
            const availableDates = [];
            const startDate = new Date(tour.start_date);
            const endDate = new Date(tour.end_date);

            for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toISOString().split('T')[0];
                const bookedCount = bookedDates[dateStr] || 0;
                const availableSlots = tour.capacity - bookedCount;

                if (availableSlots > 0) {
                    availableDates.push({
                        date: dateStr,
                        available_slots: availableSlots
                    });
                }
            }

            res.json({
                success: true,
                available_dates: availableDates,
                capacity: tour.capacity,
                booked_count: tour.booked_count
            });

        } catch (error) {
            console.error('Get available dates error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    }
};

module.exports = tourController;