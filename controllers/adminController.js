const db = require('../config/database');
const { validationResult } = require('express-validator');
const moment = require('moment');
// const fs = require('fs').promises;
// const path = require('path');
const { cloudinary } = require('../config/cloudinary');

const getPublicIdFromUrl = (url) => {
    try {
        if (!url || !url.includes('cloudinary')) return null;
        
        const splitUrl = url.split('/');
        const filename = splitUrl.pop().split('.')[0]; 
        const folder = splitUrl.pop();                 
        const parentFolder = splitUrl.pop();           
        
        return `${parentFolder}/${folder}/${filename}`;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
};
const adminController = {
    getDashboard: async (req, res) => {
        try {
            // Get dashboard statistics
            const [
                revenueStats,
                bookingStats,
                tourStats,
                userStats,
                recentBookings,
                popularTours
            ] = await Promise.all([
                // Revenue stats (last 30 days vs previous 30 days)
                db.query(`
                    SELECT 
                        SUM(CASE WHEN booked_at >= CURRENT_DATE - INTERVAL '30 days' THEN total_price ELSE 0 END) as current_period,
                        SUM(CASE WHEN booked_at >= CURRENT_DATE - INTERVAL '60 days' AND booked_at < CURRENT_DATE - INTERVAL '30 days' THEN total_price ELSE 0 END) as previous_period
                    FROM bookings 
                    WHERE status = 'confirmed'
                `),

                // Booking stats
                db.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
                    FROM bookings
                    WHERE booked_at >= CURRENT_DATE - INTERVAL '30 days'
                `),

                // Tour stats
                db.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
                        COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming,
                        COUNT(CASE WHEN featured = true THEN 1 END) as featured
                    FROM tours
                    WHERE status IN ('available', 'upcoming')
                `),

                // User stats
                db.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month,
                        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
                        COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers,
                        COUNT(CASE WHEN role = 'user' THEN 1 END) as users
                    FROM users
                    WHERE is_active = true
                    AND role != 'admin';
                `),

                // Recent bookings
                db.query(`
                    SELECT 
                        b.booking_number, b.total_price, b.status, b.booked_at,
                        t.title as tour_title,
                        u.name as user_name
                    FROM bookings b
                    JOIN tours t ON b.tour_id = t.id
                    JOIN users u ON b.user_id = u.id
                    ORDER BY b.booked_at DESC
                    LIMIT 10
                `),

                // Popular tours
                db.query(`
                    SELECT 
                        t.title,
                        COUNT(b.id) as bookings_count,
                        SUM(b.total_price) as revenue
                    FROM tours t
                    LEFT JOIN bookings b ON t.id = b.tour_id AND b.status = 'confirmed'
                    GROUP BY t.id, t.title
                    ORDER BY bookings_count DESC
                    LIMIT 5
                `)
            ]);

            const revenue = {
                total: parseFloat(revenueStats.rows[0].current_period || 0),
                trend: revenueStats.rows[0].previous_period > 0 
                    ? (((revenueStats.rows[0].current_period || 0) - (revenueStats.rows[0].previous_period || 0)) / (revenueStats.rows[0].previous_period || 0) * 100).toFixed(1)
                    : revenueStats.rows[0].current_period > 0 ? 100 : 0
            };

            res.render('admin/dashboard', {
                title: 'Admin Dashboard - Casalinga Tours',
                revenue,
                bookings: bookingStats.rows[0],
                tours: tourStats.rows[0],
                users: userStats.rows[0],
                recentBookings: recentBookings.rows,
                popularTours: popularTours.rows,
                moment
            });

        } catch (error) {
            console.error('Get dashboard error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /admin/tours
    getTours: async (req, res) => {
        try {
            const { status, page = 1 } = req.query;
            const limit = 15;
            const offset = (page - 1) * limit;

            let query = `
                SELECT 
                    t.*,
                    u.name as created_by_name,
                    (SELECT COUNT(*) FROM bookings WHERE tour_id = t.id AND status = 'confirmed') as confirmed_bookings,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
                FROM tours t
                LEFT JOIN users u ON t.created_by = u.id
            `;

            const queryParams = [];
            let paramCount = 0;

            if (status) {
                paramCount++;
                query += ` WHERE t.status = $${paramCount}`;
                queryParams.push(status);
            }

            // Count total
            const countQuery = `SELECT COUNT(*) FROM tours ${status ? 'WHERE status = $1' : ''}`;
            const countResult = await db.query(countQuery, status ? [status] : []);
            const totalTours = parseInt(countResult.rows[0].count || 0);
            const totalPages = Math.ceil(totalTours / limit);

            // Get tours with pagination
            query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            queryParams.push(limit, offset);

            const toursResult = await db.query(query, queryParams);

            // Get stats by status
            const statusStats = await db.query(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM tours
                GROUP BY status
            `);

            res.render('admin/tours/list', {
                title: 'Manage Tours - Casalinga Tours',
                tours: toursResult.rows,
                statusStats: statusStats.rows,
                currentPage: parseInt(page),
                totalPages,
                totalTours,
                statusFilter: status,
                moment
            });

        } catch (error) {
            console.error('Get tours admin error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /admin/tours/create
    createTourForm: async (req, res) => {
        try {
            const [categories, amenities] = await Promise.all([
                db.query('SELECT id, name FROM categories ORDER BY name'),
                db.query('SELECT id, name, icon FROM amenities ORDER BY name')
            ]);

            res.render('admin/tours/create', {
                title: 'Create New Tour - Casalinga Tours',
                categories: categories.rows,
                amenities: amenities.rows
            });

        } catch (error) {
            console.error('Create tour form error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /admin/tours/create
    createTour: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                req.session.error = errors.array()[0].msg;
                return res.redirect('/admin/tours/create');
            }

            const {
                title, short_description, full_description, location,
                price, discount_price, start_date, end_date,
                duration_days, capacity, status, featured,
                categories, amenities
            } = req.body;

            const images = req.files || [];
            const createdBy = req.session.user.id;

            // Generate slug
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');

            // Create tour
            const tourQuery = await db.query(
                `INSERT INTO tours (
                    title, slug, short_description, full_description,
                    location, price, discount_price, start_date, end_date,
                    duration_days, capacity, status, featured, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id`,
                [
                    title, slug, short_description, full_description,
                    location, parseFloat(price), discount_price ? parseFloat(discount_price) : null,
                    start_date, end_date, parseInt(duration_days),
                    parseInt(capacity), status, featured === 'on', createdBy
                ]
            );

            const tourId = tourQuery.rows[0].id;

            // Handle images
            if (images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    const imageUrl = image.path;
                    await db.query(
                        `INSERT INTO tour_images (tour_id, image_url, is_main, alt_text, display_order) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        [tourId, imageUrl, i === 0, title, i]
                    );
                }
            }

            // Handle categories (many-to-many)
            if (categories && categories.length > 0) {
                const categoryIds = Array.isArray(categories) ? categories : [categories];
                for (const catId of categoryIds) {
                    await db.query(
                        `INSERT INTO tour_categories (tour_id, category_id) VALUES ($1, $2)`,
                        [tourId, catId]
                    );
                }
            }

            // Handle amenities (many-to-many)
            if (amenities && amenities.length > 0) {
                const amenityIds = Array.isArray(amenities) ? amenities : [amenities];
                for (const amenityId of amenityIds) {
                    await db.query(
                        `INSERT INTO tour_amenities (tour_id, amenity_id) VALUES ($1, $2)`,
                        [tourId, amenityId]
                    );
                }
            }

            req.session.success = 'Tour created successfully!';
            res.redirect('/admin/tours');

        } catch (error) {
            console.error('Create tour error:', error);
            req.session.error = 'An error occurred while creating the tour';
            res.redirect('/admin/tours/create');
        }
    },

    // GET /admin/tours/:id/edit
    editTourForm: async (req, res) => {
        try {
            const { id } = req.params;

            const [tour, categories, amenities, tourCategories, tourAmenities, images] = await Promise.all([
                db.query('SELECT * FROM tours WHERE id = $1', [id]),
                db.query('SELECT id, name FROM categories ORDER BY name'),
                db.query('SELECT id, name, icon FROM amenities ORDER BY name'),
                db.query('SELECT category_id FROM tour_categories WHERE tour_id = $1', [id]),
                db.query('SELECT amenity_id FROM tour_amenities WHERE tour_id = $1', [id]),
                db.query('SELECT * FROM tour_images WHERE tour_id = $1 ORDER BY display_order', [id])
            ]);

            if (tour.rows.length === 0) {
                return res.status(404).render('error/404', { title: 'Tour Not Found' });
            }

            // Convert arrays to simple arrays of IDs
            const selectedCategories = tourCategories.rows.map(row => row.category_id);
            const selectedAmenities = tourAmenities.rows.map(row => row.amenity_id);

            res.render('admin/tours/edit', {
                title: 'Edit Tour - Casalinga Tours',
                tour: tour.rows[0],
                categories: categories.rows,
                amenities: amenities.rows,
                selectedCategories,
                selectedAmenities,
                images: images.rows,
                moment
            });

        } catch (error) {
            console.error('Edit tour form error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /admin/tours/:id/edit
    updateTour: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                title, short_description, full_description, location,
                price, discount_price, start_date, end_date,
                duration_days, capacity, status, featured,
                categories, amenities, remove_images
            } = req.body;

            const newImages = req.files || [];

            // 1. Update tour details
            await db.query(
                `UPDATE tours SET
                    title = $1, short_description = $2, full_description = $3, location = $4,
                    price = $5, discount_price = $6, start_date = $7, end_date = $8,
                    duration_days = $9, capacity = $10, status = $11, featured = $12,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $13`,
                [
                    title, short_description, full_description, location,
                    parseFloat(price), discount_price ? parseFloat(discount_price) : null,
                    start_date, end_date, parseInt(duration_days),
                    parseInt(capacity), status, featured === 'on', id
                ]
            );

            // 2. Handle NEW images (Cloudinary)
            if (newImages.length > 0) {
                const currentImageCount = await db.query(
                    'SELECT COUNT(*) FROM tour_images WHERE tour_id = $1',
                    [id]
                );
                const startOrder = parseInt(currentImageCount.rows[0].count) || 0;
                
                for (let i = 0; i < newImages.length; i++) {
                    const image = newImages[i];
                    // CHANGE: Use image.path (Cloudinary URL) instead of local filename
                    const imageUrl = image.path; 
                    
                    await db.query(
                        `INSERT INTO tour_images (tour_id, image_url, is_main, alt_text, display_order) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        [id, imageUrl, false, title, startOrder + i]
                    );
                }
            }

            // 3. Handle REMOVED images (Delete from Cloudinary)
            if (remove_images && remove_images.length > 0) {
                const removeIds = Array.isArray(remove_images) ? remove_images : [remove_images];
                
                for (const imageId of removeIds) {
                    const imageQuery = await db.query(
                        'SELECT image_url FROM tour_images WHERE id = $1',
                        [imageId]
                    );
                    
                    if (imageQuery.rows.length > 0) {
                        const imageUrl = imageQuery.rows[0].image_url;
                        
                        // DELETE FROM CLOUDINARY
                        const publicId = getPublicIdFromUrl(imageUrl);
                        if (publicId) {
                            try {
                                await cloudinary.uploader.destroy(publicId);
                            } catch (cloudError) {
                                console.error('Error deleting image from Cloudinary:', cloudError);
                                // Continue execution even if cloud delete fails, to ensure DB stays clean
                            }
                        }
                    }

                    // DELETE FROM DB
                    await db.query('DELETE FROM tour_images WHERE id = $1', [imageId]);
                }
            }

            // 4. Update categories (Many-to-Many)
            await db.query('DELETE FROM tour_categories WHERE tour_id = $1', [id]);
            if (categories && categories.length > 0) {
                const categoryIds = Array.isArray(categories) ? categories : [categories];
                for (const catId of categoryIds) {
                    await db.query(
                        `INSERT INTO tour_categories (tour_id, category_id) VALUES ($1, $2)`,
                        [id, catId]
                    );
                }
            }

            // 5. Update amenities (Many-to-Many)
            await db.query('DELETE FROM tour_amenities WHERE tour_id = $1', [id]);
            if (amenities && amenities.length > 0) {
                const amenityIds = Array.isArray(amenities) ? amenities : [amenities];
                for (const amenityId of amenityIds) {
                    await db.query(
                        `INSERT INTO tour_amenities (tour_id, amenity_id) VALUES ($1, $2)`,
                        [id, amenityId]
                    );
                }
            }

            req.session.success = 'Tour updated successfully!';
            res.redirect('/admin/tours');

        } catch (error) {
            console.error('Update tour error:', error);
            req.session.error = 'An error occurred while updating the tour';
            res.redirect(`/admin/tours/${req.params.id}/edit`);
        }
    },

    // POST /admin/tours/:id/delete
    deleteTour: async (req, res) => {
        try {
            const { id } = req.params;

            // 1. Check if tour has bookings
            const bookingsQuery = await db.query(
                "SELECT COUNT(*) FROM bookings WHERE tour_id = $1 AND status = 'confirmed'",
                [id]
            );

            if (parseInt(bookingsQuery.rows[0].count) > 0) {
                req.session.error = 'Cannot delete tour with confirmed bookings';
                return res.redirect('/admin/tours');
            }

            // 2. Get images to delete from Cloudinary
            const imagesQuery = await db.query(
                'SELECT image_url FROM tour_images WHERE tour_id = $1',
                [id]
            );

            // 3. Delete images from Cloudinary
            for (const image of imagesQuery.rows) {
                const publicId = getPublicIdFromUrl(image.image_url);
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId);
                    } catch (cloudError) {
                        console.error('Error deleting image from Cloudinary:', cloudError);
                    }
                }
            }

            // 4. Delete tour (Cascade handles related records in DB)
            await db.query('DELETE FROM tours WHERE id = $1', [id]);

            req.session.success = 'Tour deleted successfully';
            res.redirect('/admin/tours');

        } catch (error) {
            console.error('Delete tour error:', error);
            req.session.error = 'An error occurred while deleting the tour';
            res.redirect('/admin/tours');
        }
    },

    // POST /admin/tours/:id/status
    updateTourStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['upcoming', 'available', 'fully_booked', 'cancelled', 'completed'].includes(status)) {
                req.session.error = 'Invalid status';
                return res.redirect('/admin/tours');
            }

            await db.query(
                'UPDATE tours SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [status, id]
            );

            req.session.success = 'Tour status updated successfully';
            res.redirect('/admin/tours');

        } catch (error) {
            console.error('Update tour status error:', error);
            req.session.error = 'An error occurred while updating tour status';
            res.redirect('/admin/tours');
        }
    },

    // GET /admin/bookings
    getBookings: async (req, res) => {
        try {
            const { status, tour_id, start_date, end_date, page = 1 } = req.query;
            const limit = 20;
            const offset = (page - 1) * limit;

            let baseQuery = `
                FROM bookings b
                JOIN tours t ON b.tour_id = t.id
                JOIN users u ON b.user_id = u.id
                WHERE 1=1
            `;

            const queryParams = [];
            let paramCount = 0;

            if (status) {
                paramCount++;
                baseQuery += ` AND b.status = $${paramCount}`;
                queryParams.push(status);
            }

            if (tour_id) {
                paramCount++;
                baseQuery += ` AND b.tour_id = $${paramCount}`;
                queryParams.push(tour_id);
            }

            if (start_date) {
                paramCount++;
                baseQuery += ` AND DATE(b.booked_at) >= $${paramCount}`;
                queryParams.push(start_date);
            }

            if (end_date) {
                paramCount++;
                baseQuery += ` AND DATE(b.booked_at) <= $${paramCount}`;
                queryParams.push(end_date);
            }

            // Count total
            const countQuery = `SELECT COUNT(*) ${baseQuery}`;
            const countResult = await db.query(countQuery, queryParams);
            const totalBookings = parseInt(countResult.rows[0].count || 0);
            const totalPages = Math.ceil(totalBookings / limit);

            // Get bookings with pagination
            let query = `
                SELECT 
                    b.*,
                    t.title as tour_title,
                    t.slug as tour_slug,
                    u.name as customer_name,
                    u.email as customer_email
                ${baseQuery}
                ORDER BY b.booked_at DESC 
                LIMIT $${paramCount + 1} 
                OFFSET $${paramCount + 2}
            `;
            queryParams.push(limit, offset);

            const bookingsResult = await db.query(query, queryParams);

            // Get tours for filter dropdown
            const tours = await db.query(
                'SELECT id, title FROM tours ORDER BY title'
            );

            // Get booking statistics
            const statsQuery = await db.query(`
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(total_price) as total_revenue
                FROM bookings
                WHERE booked_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY status
            `);

            res.render('admin/bookings/list', {
                title: 'Manage Bookings - Casalinga Tours',
                bookings: bookingsResult.rows,
                tours: tours.rows,
                stats: statsQuery.rows,
                currentPage: parseInt(page),
                totalPages,
                totalBookings,
                filters: { status, tour_id, start_date, end_date },
                moment
            });

        } catch (error) {
            console.error('Get bookings error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /admin/bookings/:id
    getBookingDetails: async (req, res) => {
        try {
            const { id } = req.params;

            const bookingQuery = await db.query(
                `SELECT 
                    b.*,
                    t.title, t.slug, t.location, t.start_date, t.end_date,
                    u.name as customer_name, u.email as customer_email, u.phone as customer_phone
                 FROM bookings b
                 JOIN tours t ON b.tour_id = t.id
                 JOIN users u ON b.user_id = u.id
                 WHERE b.id = $1`,
                [id]
            );

            if (bookingQuery.rows.length === 0) {
                return res.status(404).render('error/404', { title: 'Booking Not Found' });
            }

            const booking = bookingQuery.rows[0];

            // Get tour amenities
            const amenitiesQuery = await db.query(
                `SELECT a.name, a.icon 
                 FROM amenities a
                 JOIN tour_amenities ta ON a.id = ta.amenity_id
                 WHERE ta.tour_id = $1`,
                [booking.tour_id]
            );

            res.render('admin/bookings/view', {
                title: `Booking ${booking.booking_number} - Casalinga Tours`,
                booking,
                amenities: amenitiesQuery.rows,
                moment
            });

        } catch (error) {
            console.error('Get booking details error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /admin/bookings/:id/confirm
    confirmBooking: async (req, res) => {
        try {
            const { id } = req.params;

            await db.query(
                `UPDATE bookings 
                 SET status = 'confirmed', 
                     confirmed_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [id]
            );

            req.session.success = 'Booking confirmed successfully';
            res.redirect(`/admin/bookings/${id}`);

        } catch (error) {
            console.error('Confirm booking error:', error);
            req.session.error = 'An error occurred while confirming booking';
            res.redirect(`/admin/bookings/${id}`);
        }
    },

    // POST /admin/bookings/:id/cancel
    cancelBooking: async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            await db.query(
                `UPDATE bookings 
                 SET status = 'cancelled', 
                     cancellation_reason = $1,
                     cancelled_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2`,
                [reason, id]
            );

            req.session.success = 'Booking cancelled successfully';
            res.redirect(`/admin/bookings/${id}`);

        } catch (error) {
            console.error('Cancel booking error:', error);
            req.session.error = 'An error occurred while cancelling booking';
            res.redirect(`/admin/bookings/${id}`);
        }
    },

    // GET /admin/bookings/calendar
    getBookingCalendar: async (req, res) => {
        try {
            const { month, year } = req.query;
            const currentMonth = month || moment().format('MM');
            const currentYear = year || moment().format('YYYY');
            
            const startDate = `${currentYear}-${currentMonth}-01`;
            const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');

            const bookingsQuery = await db.query(
                `SELECT 
                    b.*,
                    t.title as tour_title,
                    u.name as customer_name
                 FROM bookings b
                 JOIN tours t ON b.tour_id = t.id
                 JOIN users u ON b.user_id = u.id
                 WHERE DATE(b.booked_at) BETWEEN $1 AND $2
                 ORDER BY b.booked_at`,
                [startDate, endDate]
            );

            res.render('admin/bookings/calendar', {
                title: 'Booking Calendar - Casalinga Tours',
                bookings: bookingsQuery.rows,
                currentMonth,
                currentYear,
                moment
            });

        } catch (error) {
            console.error('Get booking calendar error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /admin/analytics
    getAnalytics: async (req, res) => {
        const moment = require('moment'); // Add this if not already present
        try {
            const { period = 'month' } = req.query; // 'month' (last 12m) or 'year' (this year)
            const startInterval = period === 'year' 
                ? `DATE_TRUNC('year', CURRENT_DATE)` 
                : `DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'`;

            // 1. SMART REVENUE TREND (With Zero-Filling)
            // Uses PostgreSQL 'generate_series' to ensure every month appears on the graph, even if 0 revenue.
            const revenueTrend = await db.query(`
                WITH months AS (
                    SELECT generate_series(
                        ${startInterval},
                        DATE_TRUNC('month', CURRENT_DATE),
                        '1 month'::interval
                    ) AS month
                )
                SELECT
                    m.month,
                    COALESCE(SUM(b.total_price), 0) as revenue,
                    COUNT(b.id) as bookings
                FROM months m
                LEFT JOIN bookings b
                    ON DATE_TRUNC('month', b.booked_at) = m.month
                    AND b.status = 'confirmed'
                GROUP BY m.month
                ORDER BY m.month ASC
            `);

            // 2. REVENUE BY CATEGORY (Deep Dive)
            const revenueByCategory = await db.query(`
                SELECT
                    c.name as category,
                    COALESCE(SUM(b.total_price), 0) as revenue,
                    COUNT(b.id) as bookings
                FROM categories c
                LEFT JOIN tour_categories tc ON c.id = tc.category_id
                LEFT JOIN bookings b ON tc.tour_id = b.tour_id AND b.status = 'confirmed'
                    AND DATE_TRUNC('month', b.booked_at) >= ${startInterval}
                    AND DATE_TRUNC('month', b.booked_at) <= DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY c.id, c.name
                HAVING SUM(b.total_price) > 0
                ORDER BY revenue DESC
            `);

            // 3. CUSTOMER ACQUISITION (Growth)
            const customerDemographics = await db.query(`
                WITH months AS (
                    SELECT generate_series(
                        ${startInterval},
                        DATE_TRUNC('month', CURRENT_DATE),
                        '1 month'::interval
                    ) AS month
                )
                SELECT
                    m.month,
                    COUNT(u.id) as new_customers
                FROM months m
                LEFT JOIN users u
                    ON DATE_TRUNC('month', u.created_at) = m.month
                    AND u.role = 'user'
                GROUP BY m.month
                ORDER BY m.month ASC
            `);

            // 4. VIP CUSTOMERS (Lifetime Value)
            const topCustomers = await db.query(`
                SELECT
                    u.name,
                    u.email,
                    COUNT(b.id) as total_bookings,
                    COALESCE(SUM(b.total_price), 0) as total_spent
                FROM users u
                JOIN bookings b ON u.id = b.user_id
                WHERE b.status = 'confirmed'
                    AND DATE_TRUNC('month', b.booked_at) >= ${startInterval}
                    AND DATE_TRUNC('month', b.booked_at) <= DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY u.id, u.name, u.email
                ORDER BY total_spent DESC
                LIMIT 7
            `);

            // Render the view with the data
            res.render('admin/analytics/overview', {
                title: 'Analytics Intelligence - Casalinga Tours',
                // We pass the raw rows. The frontend JS handles the formatting.
                revenueTrend: revenueTrend.rows,
                revenueByCategory: revenueByCategory.rows,
                customerDemographics: customerDemographics.rows,
                topCustomers: topCustomers.rows,
                period,
                moment
            });
        } catch (error) {
            console.error('Analytics Intelligence Error:', error);
            // Fallback to empty data so the page doesn't crash
            res.render('admin/analytics/overview', {
                title: 'Analytics Intelligence - Casalinga Tours',
                revenueTrend: [],
                revenueByCategory: [],
                customerDemographics: [],
                topCustomers: [],
                period,
                moment
            });
        }
    },

    // GET /admin/analytics/revenue
    getRevenueAnalytics: async (req, res) => {
        try {
            const { period = 'month', start_date, end_date } = req.query;
            
            let dateTrunc = 'month';
            let interval = '12 months';
            
            switch (period) {
                case 'day':
                    dateTrunc = 'day';
                    interval = '30 days';
                    break;
                case 'week':
                    dateTrunc = 'week';
                    interval = '12 weeks';
                    break;
                case 'year':
                    dateTrunc = 'year';
                    interval = '5 years';
                    break;
            }

            let query = `
                SELECT 
                    DATE_TRUNC('${dateTrunc}', booked_at) as period,
                    SUM(total_price) as revenue,
                    COUNT(*) as bookings,
                    AVG(total_price) as avg_booking_value
                FROM bookings
                WHERE status = 'confirmed'
            `;

            const queryParams = [];
            let paramCount = 0;

            if (start_date) {
                paramCount++;
                query += ` AND booked_at >= $${paramCount}`;
                queryParams.push(start_date);
            } else {
                query += ` AND booked_at >= CURRENT_DATE - INTERVAL '${interval}'`;
            }

            if (end_date) {
                paramCount++;
                query += ` AND booked_at <= $${paramCount}`;
                queryParams.push(end_date);
            }

            query += ` GROUP BY DATE_TRUNC('${dateTrunc}', booked_at) ORDER BY period`;

            const revenueData = await db.query(query, queryParams);

            // Get top revenue tours
            const topTours = await db.query(`
                SELECT 
                    t.title,
                    SUM(b.total_price) as revenue,
                    COUNT(b.id) as bookings
                FROM tours t
                LEFT JOIN bookings b ON t.id = b.tour_id AND b.status = 'confirmed'
                GROUP BY t.id, t.title
                ORDER BY revenue DESC NULLS LAST
                LIMIT 10
            `);

            res.render('admin/analytics/revenue', {
                title: 'Revenue Analytics - Casalinga Tours',
                revenueData: revenueData.rows,
                topTours: topTours.rows,
                period,
                start_date,
                end_date,
                moment
            });

        } catch (error) {
            console.error('Get revenue analytics error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /admin/analytics/popular-tours
    getPopularTours: async (req, res) => {
        try {
            const { start_date, end_date } = req.query;

            let query = `
                SELECT 
                    t.id,
                    t.title,
                    t.slug,
                    t.price,
                    COUNT(b.id) as bookings_count,
                    SUM(b.total_price) as revenue,
                    AVG(b.people_count) as avg_people,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
                FROM tours t
                LEFT JOIN bookings b ON t.id = b.tour_id AND b.status = 'confirmed'
                WHERE 1=1
            `;

            const queryParams = [];
            let paramCount = 0;

            if (start_date) {
                paramCount++;
                query += ` AND b.booked_at >= $${paramCount}`;
                queryParams.push(start_date);
            }

            if (end_date) {
                paramCount++;
                query += ` AND b.booked_at <= $${paramCount}`;
                queryParams.push(end_date);
            }

            query += ` GROUP BY t.id, t.title, t.slug, t.price ORDER BY bookings_count DESC NULLS LAST`;

            const popularTours = await db.query(query, queryParams);

            // Get tour categories
            const categories = await db.query(`
                SELECT 
                    c.name as category,
                    COUNT(DISTINCT t.id) as tour_count,
                    COUNT(b.id) as bookings_count,
                    SUM(b.total_price) as revenue
                FROM categories c
                LEFT JOIN tour_categories tc ON c.id = tc.category_id
                LEFT JOIN tours t ON tc.tour_id = t.id
                LEFT JOIN bookings b ON t.id = b.tour_id AND b.status = 'confirmed'
                GROUP BY c.id, c.name
                ORDER BY revenue DESC NULLS LAST
            `);

            res.render('admin/analytics/popular-tours', {
                title: 'Popular Tours Analytics - Casalinga Tours',
                popularTours: popularTours.rows,
                categories: categories.rows,
                start_date,
                end_date,
                moment
            });

        } catch (error) {
            console.error('Get popular tours error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /admin/users
    getUsers: async (req, res) => {
        try {
            const { role, page = 1, search } = req.query;
            const limit = 20;
            const offset = (page - 1) * limit;

            let query = `
                SELECT 
                    u.*,
                    COUNT(b.id) as total_bookings,
                    SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as total_spent
                FROM users u
                LEFT JOIN bookings b ON u.id = b.user_id
                WHERE u.is_active = true
            `;

            const queryParams = [];
            let paramCount = 0;

            if (role) {
                paramCount++;
                query += ` AND u.role = $${paramCount}`;
                queryParams.push(role);
            }

            if (search) {
                paramCount++;
                query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
                queryParams.push(`%${search}%`);
            }

            query += ` GROUP BY u.id`;

            // Count total
            const countQuery = query.replace('SELECT u.*, COUNT(b.id) as total_bookings, SUM(CASE WHEN b.status = \'confirmed\' THEN b.total_price ELSE 0 END) as total_spent', 'SELECT COUNT(DISTINCT u.id)');
            const countResult = await db.query(countQuery, queryParams);
            const totalUsers = parseInt(countResult.rows[0].count || 0);
            const totalPages = Math.ceil(totalUsers / limit);

            // Get users with pagination
            query += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            queryParams.push(limit, offset);

            const usersResult = await db.query(query, queryParams);

            // Get user stats by role
            const roleStats = await db.query(`
                SELECT 
                    role,
                    COUNT(*) as count
                FROM users
                WHERE is_active = true
                GROUP BY role
            `);

            res.render('admin/users/list', {
                title: 'User Management - Casalinga Tours',
                users: usersResult.rows,
                roleStats: roleStats.rows,
                currentPage: parseInt(page),
                totalPages,
                totalUsers,
                roleFilter: role,
                search,
                moment
            });

        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /admin/users/:id/role
    updateUserRole: async (req, res) => {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!['admin', 'manager', 'user'].includes(role)) {
                req.session.error = 'Invalid role specified';
                return res.redirect('/admin/users');
            }

            await db.query(
                'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [role, id]
            );

            req.session.success = 'User role updated successfully';
            res.redirect('/admin/users');

        } catch (error) {
            console.error('Update user role error:', error);
            req.session.error = 'An error occurred while updating user role';
            res.redirect('/admin/users');
        }
    },

    // POST /admin/users/:id/status
    updateUserStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['active', 'inactive'].includes(status)) {
                req.session.error = 'Invalid status';
                return res.redirect('/admin/users');
            }

            await db.query(
                'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [status === 'active', id]
            );

            req.session.success = `User ${status} successfully`;
            res.redirect('/admin/users');

        } catch (error) {
            console.error('Update user status error:', error);
            req.session.error = 'An error occurred while updating user status';
            res.redirect('/admin/users');
        }
    },

    // GET /admin/settings/amenities
    manageAmenities: async (req, res) => {
        try {
            const amenities = await db.query(
                'SELECT * FROM amenities ORDER BY name'
            );

            res.render('admin/settings/amenities', {
                title: 'Manage Amenities - Casalinga Tours',
                amenities: amenities.rows
            });

        } catch (error) {
            console.error('Manage amenities error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /admin/settings/amenities
    createAmenity: async (req, res) => {
        try {
            const { name, icon, description } = req.body;

            await db.query(
                'INSERT INTO amenities (name, icon, description) VALUES ($1, $2, $3)',
                [name, icon, description]
            );

            req.session.success = 'Amenity created successfully';
            res.redirect('/admin/settings/amenities');

        } catch (error) {
            console.error('Create amenity error:', error);
            req.session.error = 'An error occurred while creating amenity';
            res.redirect('/admin/settings/amenities');
        }
    },

    // GET /admin/settings/categories
    manageCategories: async (req, res) => {
        try {
            const categories = await db.query(
                'SELECT * FROM categories ORDER BY name'
            );

            res.render('admin/settings/categories', {
                title: 'Manage Categories - Casalinga Tours',
                categories: categories.rows
            });

        } catch (error) {
            console.error('Manage categories error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /admin/settings/categories
    createCategory: async (req, res) => {
        try {
            const { name, description, icon, color } = req.body;

            await db.query(
                'INSERT INTO categories (name, description, icon, color) VALUES ($1, $2, $3, $4)',
                [name, description, icon, color]
            );

            req.session.success = 'Category created successfully';
            res.redirect('/admin/settings/categories');

        } catch (error) {
            console.error('Create category error:', error);
            req.session.error = 'An error occurred while creating category';
            res.redirect('/admin/settings/categories');
        }
    },

    // GET /admin/reports/bookings
    getBookingReports: async (req, res) => {
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
                const headers = ['Booking Number', 'Customer Name', 'Tour', 'Total Price', 'Status', 'Booked At'];
                const rows = bookings.rows.map(booking => [
                    booking.booking_number,
                    booking.customer_name,
                    booking.title,
                    booking.total_price,
                    booking.status,
                    moment(booking.booked_at).format('YYYY-MM-DD HH:mm:ss')
                ]);
                
                const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

                res.header('Content-Type', 'text/csv');
                res.attachment('bookings-report.csv');
                return res.send(csvContent);
            }

            res.render('admin/reports/bookings', {
                title: 'Bookings Report - Casalinga Tours',
                bookings: bookings.rows,
                filters: { start_date, end_date },
                moment
            });
        } catch (error) {
            console.error('Reports error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    }
};

module.exports = adminController;