const db = require('../config/database');
const { validationResult } = require('express-validator');
const moment = require('moment');
const crypto = require('crypto');

const bookingController = {
    // POST /bookings/create
    createBooking: async (req, res) => {
        try {
            if (!req.session.user) {
                req.session.error = 'Please login to book a tour';
                return res.redirect('/auth/login');
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                req.session.error = errors.array()[0].msg;
                // Safe redirect
                const redirectUrl = req.body.tour_slug ? `/tours/${req.body.tour_slug}` : '/tours';
                return res.redirect(redirectUrl);
            }

            const { tour_id, tour_date, people_count, special_requests } = req.body;
            const userId = req.session.user.id;

            // 1. Get tour details
            const tourQuery = await db.query(
                'SELECT id, title, price, discount_price, capacity FROM tours WHERE id = $1',
                [tour_id]
            );

            if (tourQuery.rows.length === 0) {
                req.session.error = 'Tour not found';
                return res.redirect('/tours');
            }

            const tour = tourQuery.rows[0];
            const tourPrice = tour.discount_price || tour.price;

            // 2. Check capacity
            const bookedQuery = await db.query(
                `SELECT SUM(people_count) as total_booked 
                 FROM bookings 
                 WHERE tour_id = $1 AND booked_at::date = $2 AND status = 'confirmed'`,
                [tour_id, tour_date]
            );

            const totalBooked = parseInt(bookedQuery.rows[0].total_booked) || 0;
            const availableSlots = tour.capacity - totalBooked;

            if (parseInt(people_count) > availableSlots) {
                req.session.error = `Only ${availableSlots} slots available for this date`;
                return res.redirect(`/tours/${req.body.tour_slug}`);
            }

            // 3. Calculate total price
            const totalPrice = tourPrice * people_count;

            // 4. Generate ULTRA UNIQUE Booking Number
            // Format: CT-YYMMDD-XXXXXX (e.g., CT-240126-AB9F21)
            // Using random bytes eliminates the duplicate key error completely.
            const datePart = moment().format('YYMMDD');
            const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase(); 
            const bookingNumber = `CT-${datePart}-${randomPart}`;

            // 5. Create booking
            const bookingQuery = await db.query(
                `INSERT INTO bookings (
                    booking_number, user_id, tour_id, people_count,
                    total_price, special_requests, booked_at, status
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'confirmed')
                RETURNING id, booking_number`,
                [bookingNumber, userId, tour_id, people_count, 
                 totalPrice, special_requests]
            );

            // 6. Update tour booked count
            await db.query(
                'UPDATE tours SET booked_count = booked_count + $1 WHERE id = $2',
                [people_count, tour_id]
            );

            req.session.success = `Booking created successfully! Your booking number is ${bookingQuery.rows[0].booking_number}`;
            res.redirect(`/user/bookings/${bookingQuery.rows[0].id}`);

        } catch (error) {
            console.error('Create booking error:', error);
            req.session.error = 'An error occurred while creating your booking';
            // Fallback redirect
            const redirectUrl = req.body.tour_slug ? `/tours/${req.body.tour_slug}` : '/tours';
            res.redirect(redirectUrl);
        }
    },

    // GET /user/bookings
    getUserBookings: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.redirect('/auth/login');
            }

            const userId = req.session.user.id;
            const { status, page = 1 } = req.query;
            const limit = 10;
            const offset = (page - 1) * limit;

            let query = `
                SELECT 
                    b.id, b.booking_number, b.people_count, b.total_price,
                    b.status, b.payment_status, b.booked_at, b.confirmed_at,
                    t.title, t.slug, t.location,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as tour_image
                FROM bookings b
                JOIN tours t ON b.tour_id = t.id
                WHERE b.user_id = $1
            `;

            const queryParams = [userId];
            let paramCount = 1;

            if (status) {
                paramCount++;
                query += ` AND b.status = $${paramCount}`;
                queryParams.push(status);
            }

            query += ` ORDER BY b.booked_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            queryParams.push(limit, offset);

            const bookingsResult = await db.query(query, queryParams);

            // Count total bookings
            let countQuery = 'SELECT COUNT(*) FROM bookings WHERE user_id = $1';
            const countParams = [userId];

            if (status) {
                countQuery += ' AND status = $2';
                countParams.push(status);
            }

            const countResult = await db.query(countQuery, countParams);
            const totalBookings = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalBookings / limit);

            // Get booking statistics
            const statsQuery = await db.query(
                `SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(total_price) as total_amount
                 FROM bookings 
                 WHERE user_id = $1 
                 GROUP BY status`,
                [userId]
            );

            const stats = {
                pending: 0,
                confirmed: 0,
                cancelled: 0,
                total: totalBookings
            };

            statsQuery.rows.forEach(row => {
                stats[row.status] = row.count;
            });

            res.render('user/bookings', {
                title: 'My Bookings - Casalinga Tours',
                bookings: bookingsResult.rows,
                stats,
                currentPage: parseInt(page),
                totalPages,
                totalBookings,
                statusFilter: status,
                moment
            });

        } catch (error) {
            console.error('Get user bookings error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /user/bookings/:id
    getBookingDetails: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.redirect('/auth/login');
            }

            const { id } = req.params;
            const userId = req.session.user.id;

            const bookingQuery = await db.query(
                `SELECT 
                    b.*,
                    t.title, t.slug, t.location, t.full_description,
                    t.start_date, t.end_date, t.duration_days,
                    u.name as user_name, u.email as user_email, u.phone as user_phone,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as tour_image
                 FROM bookings b
                 JOIN tours t ON b.tour_id = t.id
                 JOIN users u ON b.user_id = u.id
                 WHERE b.id = $1 AND (b.user_id = $2 OR $3 IN ('admin', 'manager'))`,
                [id, userId, req.session.user.role]
            );

            if (bookingQuery.rows.length === 0) {
                return res.status(404).render('error/404', { title: 'Booking Not Found' });
            }

            const booking = bookingQuery.rows[0];

            // Get tour amenities for this booking
            const amenitiesQuery = await db.query(
                `SELECT a.name, a.icon 
                 FROM amenities a
                 JOIN tour_amenities ta ON a.id = ta.amenity_id
                 WHERE ta.tour_id = $1`,
                [booking.tour_id]
            );

            res.render('user/booking-details', {
                title: `Booking ${booking.booking_number} - Casalinga Tours`,
                booking,
                amenities: amenitiesQuery.rows,
                moment,
                isAdmin: req.session.user.role === 'admin',
                isManager: req.session.user.role === 'manager'
            });

        } catch (error) {
            console.error('Get booking details error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /bookings/:id/cancel
    cancelBooking: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Please login' });
            }

            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.session.user.id;

            // Check if booking exists and user has permission
            const bookingQuery = await db.query(
                `SELECT b.*, t.capacity 
                 FROM bookings b
                 JOIN tours t ON b.tour_id = t.id
                 WHERE b.id = $1 AND (b.user_id = $2 OR $3 IN ('admin', 'manager'))`,
                [id, userId, req.session.user.role]
            );

            if (bookingQuery.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Booking not found' });
            }

            const booking = bookingQuery.rows[0];

            // Update booking status
            await db.query(
                `UPDATE bookings 
                 SET status = 'cancelled', 
                     cancellation_reason = $1,
                     cancelled_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [reason, id]
            );

            // Update tour booked count
            await db.query(
                'UPDATE tours SET booked_count = booked_count - $1 WHERE id = $2',
                [booking.people_count, booking.tour_id]
            );

            // If admin/manager cancelled, notify user
            if (req.session.user.role === 'admin' || req.session.user.role === 'manager') {
                // Send notification to user (in production, send email)
                console.log(`Booking ${booking.booking_number} cancelled by ${req.session.user.name}`);
            }

            req.session.success = 'Booking cancelled successfully';
            res.json({ success: true });

        } catch (error) {
            console.error('Cancel booking error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    },

    // POST /bookings/:id/confirm (Admin/Manager only)
    confirmBooking: async (req, res) => {
        try {
            if (!req.session.user || !['admin', 'manager'].includes(req.session.user.role)) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            const { id } = req.params;

            const bookingQuery = await db.query(
                'SELECT id, booking_number, user_id FROM bookings WHERE id = $1',
                [id]
            );

            if (bookingQuery.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Booking not found' });
            }

            // Update booking status
            await db.query(
                `UPDATE bookings 
                 SET status = 'confirmed', 
                     confirmed_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [id]
            );

            const booking = bookingQuery.rows[0];

            // Notify user (in production, send email)
            console.log(`Booking ${booking.booking_number} confirmed by ${req.session.user.name}`);

            req.session.success = 'Booking confirmed successfully';
            res.json({ success: true });

        } catch (error) {
            console.error('Confirm booking error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    },

    // POST /api/bookings/check-availability
    checkAvailability: async (req, res) => {
        try {
            const { tour_id, date, people_count } = req.body;

            const tourQuery = await db.query(
                'SELECT capacity FROM tours WHERE id = $1',
                [tour_id]
            );

            if (tourQuery.rows.length === 0) {
                return res.json({ success: false, message: 'Tour not found' });
            }

            const capacity = tourQuery.rows[0].capacity;

            const bookedQuery = await db.query(
                `SELECT SUM(people_count) as total_booked 
                 FROM bookings 
                 WHERE tour_id = $1 AND booked_at::date = $2 AND status = 'confirmed'`,
                [tour_id, date]
            );

            const totalBooked = parseInt(bookedQuery.rows[0].total_booked) || 0;
            const availableSlots = capacity - totalBooked;

            const isAvailable = people_count <= availableSlots;

            res.json({
                success: true,
                is_available: isAvailable,
                available_slots: availableSlots,
                requested_slots: people_count
            });

        } catch (error) {
            console.error('Check availability error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    }
};

module.exports = bookingController;