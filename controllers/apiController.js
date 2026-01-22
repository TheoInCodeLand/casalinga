const db = require('../config/database');
const { validationResult } = require('express-validator');
const moment = require('moment');

const apiController = {
    // GET /api/tours
    getTours: async (req, res) => {
        try {
            const { limit = 20, offset = 0, status, featured, category } = req.query;

            let query = `
                SELECT 
                    t.id, t.title, t.slug, t.short_description,
                    t.full_description, t.location, t.price, t.discount_price,
                    t.start_date, t.end_date, t.duration_days,
                    t.capacity, t.booked_count, t.status, t.featured,
                    t.created_at,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
                FROM tours t
                WHERE 1=1
            `;

            const queryParams = [];
            let paramCount = 0;

            if (status) {
                paramCount++;
                query += ` AND t.status = $${paramCount}`;
                queryParams.push(status);
            }

            if (featured === 'true') {
                paramCount++;
                query += ` AND t.featured = true`;
            }

            if (category) {
                paramCount++;
                query += ` AND EXISTS (
                    SELECT 1 FROM tour_categories tc 
                    JOIN categories c ON tc.category_id = c.id 
                    WHERE tc.tour_id = t.id AND c.id = $${paramCount}
                )`;
                queryParams.push(category);
            }

            query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            queryParams.push(parseInt(limit), parseInt(offset));

            const tours = await db.query(query, queryParams);

            // Get total count
            const countQuery = query.replace('SELECT t.id, t.title, t.slug, t.short_description, t.full_description, t.location, t.price, t.discount_price, t.start_date, t.end_date, t.duration_days, t.capacity, t.booked_count, t.status, t.featured, t.created_at, (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image', 'SELECT COUNT(*)');
            const countResult = await db.query(countQuery, queryParams.slice(0, -2));
            const total = parseInt(countResult.rows[0].count);

            res.json({
                success: true,
                data: tours.rows,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total
                }
            });

        } catch (error) {
            console.error('API get tours error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    },

    // GET /api/tours/:id
    getTour: async (req, res) => {
        try {
            const { id } = req.params;

            const tourQuery = await db.query(
                `SELECT 
                    t.*,
                    u.name as created_by_name
                 FROM tours t
                 LEFT JOIN users u ON t.created_by = u.id
                 WHERE t.id = $1`,
                [id]
            );

            if (tourQuery.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Tour not found' 
                });
            }

            const tour = tourQuery.rows[0];

            // Get images
            const images = await db.query(
                'SELECT id, image_url, alt_text, is_main FROM tour_images WHERE tour_id = $1 ORDER BY display_order',
                [id]
            );

            // Get amenities
            const amenities = await db.query(
                `SELECT a.id, a.name, a.icon, a.description 
                 FROM amenities a
                 JOIN tour_amenities ta ON a.id = ta.amenity_id
                 WHERE ta.tour_id = $1`,
                [id]
            );

            // Get categories
            const categories = await db.query(
                `SELECT c.id, c.name, c.icon, c.color 
                 FROM categories c
                 JOIN tour_categories tc ON c.id = tc.category_id
                 WHERE tc.tour_id = $1`,
                [id]
            );

            res.json({
                success: true,
                data: {
                    ...tour,
                    images: images.rows,
                    amenities: amenities.rows,
                    categories: categories.rows
                }
            });

        } catch (error) {
            console.error('API get tour error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    },

    // POST /api/bookings
    createBooking: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false, 
                    errors: errors.array() 
                });
            }

            const { 
                tour_id, tour_date, people_count, 
                user_name, user_email, user_phone,
                special_requests 
            } = req.body;

            // Get tour details
            const tourQuery = await db.query(
                'SELECT id, title, price, discount_price, capacity FROM tours WHERE id = $1',
                [tour_id]
            );

            if (tourQuery.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Tour not found' 
                });
            }

            const tour = tourQuery.rows[0];
            const tourPrice = tour.discount_price || tour.price;

            // Check capacity
            const bookedQuery = await db.query(
                `SELECT SUM(people_count) as total_booked 
                 FROM bookings 
                 WHERE tour_id = $1 AND booked_at::date = $2 AND status = 'confirmed'`,
                [tour_id, tour_date]
            );

            const totalBooked = parseInt(bookedQuery.rows[0].total_booked) || 0;
            const availableSlots = tour.capacity - totalBooked;

            if (people_count > availableSlots) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Only ${availableSlots} slots available for this date` 
                });
            }

            // Find or create user
            let userId;
            const userQuery = await db.query(
                'SELECT id FROM users WHERE email = $1',
                [user_email]
            );

            if (userQuery.rows.length > 0) {
                userId = userQuery.rows[0].id;
            } else {
                // Create new user
                const newUser = await db.query(
                    `INSERT INTO users (name, email, phone, role) 
                     VALUES ($1, $2, $3, 'user') 
                     RETURNING id`,
                    [user_name, user_email, user_phone]
                );
                userId = newUser.rows[0].id;
            }

            // Calculate total price
            const totalPrice = tourPrice * people_count;

            // Generate booking number
            const bookingNumberQuery = await db.query(
                "SELECT 'CT-' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' || LPAD(COALESCE(MAX(SUBSTRING(booking_number FROM 10)::INTEGER), 0) + 1, 5, '0') as next_number FROM bookings WHERE booking_number LIKE 'CT-' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-%'"
            );

            const bookingNumber = bookingNumberQuery.rows[0].next_number || 
                                 `CT-${moment().format('YYMMDD')}-00001`;

            // Create booking
            const bookingQuery = await db.query(
                `INSERT INTO bookings (
                    booking_number, user_id, tour_id, people_count,
                    total_price, special_requests, booked_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, booking_number`,
                [bookingNumber, userId, tour_id, people_count, 
                 totalPrice, special_requests, tour_date]
            );

            // Update tour booked count
            await db.query(
                'UPDATE tours SET booked_count = booked_count + $1 WHERE id = $2',
                [people_count, tour_id]
            );

            res.status(201).json({
                success: true,
                message: 'Booking created successfully',
                data: {
                    booking_id: bookingQuery.rows[0].id,
                    booking_number: bookingQuery.rows[0].booking_number,
                    total_price: totalPrice
                }
            });

        } catch (error) {
            console.error('API create booking error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    },

    // GET /api/bookings/:booking_number
    getBooking: async (req, res) => {
        try {
            const { booking_number } = req.params;

            const bookingQuery = await db.query(
                `SELECT 
                    b.*,
                    t.title, t.location, t.start_date, t.end_date,
                    u.name as user_name, u.email as user_email, u.phone as user_phone
                 FROM bookings b
                 JOIN tours t ON b.tour_id = t.id
                 JOIN users u ON b.user_id = u.id
                 WHERE b.booking_number = $1`,
                [booking_number]
            );

            if (bookingQuery.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Booking not found' 
                });
            }

            const booking = bookingQuery.rows[0];

            res.json({
                success: true,
                data: booking
            });

        } catch (error) {
            console.error('API get booking error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    },

    // GET /api/stats
    getStats: async (req, res) => {
        try {
            const [
                tourStats,
                bookingStats,
                revenueStats
            ] = await Promise.all([
                // Tour stats
                db.query(`
                    SELECT 
                        COUNT(*) as total_tours,
                        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_tours,
                        COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming_tours,
                        COUNT(CASE WHEN featured = true THEN 1 END) as featured_tours
                    FROM tours
                `),

                // Booking stats
                db.query(`
                    SELECT 
                        COUNT(*) as total_bookings,
                        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings
                    FROM bookings
                    WHERE booked_at >= CURRENT_DATE - INTERVAL '30 days'
                `),

                // Revenue stats
                db.query(`
                    SELECT 
                        SUM(CASE WHEN booked_at >= CURRENT_DATE - INTERVAL '30 days' THEN total_price ELSE 0 END) as revenue_30_days,
                        SUM(CASE WHEN booked_at >= CURRENT_DATE - INTERVAL '7 days' THEN total_price ELSE 0 END) as revenue_7_days
                    FROM bookings
                    WHERE status = 'confirmed'
                `)
            ]);

            res.json({
                success: true,
                data: {
                    tours: tourStats.rows[0],
                    bookings: bookingStats.rows[0],
                    revenue: revenueStats.rows[0]
                }
            });

        } catch (error) {
            console.error('API get stats error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    },

    // GET /api/categories
    getCategories: async (req, res) => {
        try {
            const categories = await db.query(`
                SELECT 
                    c.id, c.name, c.description, c.icon, c.color,
                    COUNT(t.id) as tour_count
                FROM categories c
                LEFT JOIN tour_categories tc ON c.id = tc.category_id
                LEFT JOIN tours t ON tc.tour_id = t.id AND t.status IN ('available', 'upcoming')
                GROUP BY c.id, c.name, c.description, c.icon, c.color
                ORDER BY c.name
            `);

            res.json({
                success: true,
                data: categories.rows
            });

        } catch (error) {
            console.error('API get categories error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    },

    // POST /api/contact
    sendContactMessage: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false, 
                    errors: errors.array() 
                });
            }

            const { name, email, subject, message } = req.body;

            // Save contact message to database
            await db.query(
                `INSERT INTO contact_messages (name, email, subject, message) 
                 VALUES ($1, $2, $3, $4)`,
                [name, email, subject, message]
            );

            // In production, send email notification
            console.log(`Contact message from ${name} (${email}): ${subject}`);

            res.json({
                success: true,
                message: 'Message sent successfully. We will contact you soon.'
            });

        } catch (error) {
            console.error('API send contact message error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    },

    // GET /api/availability/:tour_id
    checkAvailability: async (req, res) => {
        try {
            const { tour_id } = req.params;
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Date parameter is required' 
                });
            }

            const tourQuery = await db.query(
                'SELECT capacity, start_date, end_date FROM tours WHERE id = $1',
                [tour_id]
            );

            if (tourQuery.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Tour not found' 
                });
            }

            const tour = tourQuery.rows[0];
            const queryDate = new Date(date);

            // Check if date is within tour dates
            if (queryDate < new Date(tour.start_date) || queryDate > new Date(tour.end_date)) {
                return res.json({
                    success: true,
                    available: false,
                    reason: 'Date is outside tour schedule'
                });
            }

            const bookedQuery = await db.query(
                `SELECT SUM(people_count) as total_booked 
                 FROM bookings 
                 WHERE tour_id = $1 AND booked_at::date = $2 AND status = 'confirmed'`,
                [tour_id, date]
            );

            const totalBooked = parseInt(bookedQuery.rows[0].total_booked) || 0;
            const availableSlots = tour.capacity - totalBooked;

            res.json({
                success: true,
                available: availableSlots > 0,
                available_slots: availableSlots,
                capacity: tour.capacity,
                booked: totalBooked
            });

        } catch (error) {
            console.error('API check availability error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }
};

module.exports = apiController;