const db = require('../config/database');
const moment = require('moment');

const Booking = {
    // Create a new booking
    create: async (bookingData) => {
        const {
            user_id, tour_id, people_count, total_price,
            special_requests, booked_at, booking_number
        } = bookingData;

        const result = await db.query(
            `INSERT INTO bookings (
                booking_number, user_id, tour_id, people_count,
                total_price, special_requests, booked_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [booking_number, user_id, tour_id, people_count, 
             total_price, special_requests, booked_at]
        );
        
        return result.rows[0];
    },

    // Generate unique booking number
    generateBookingNumber: async () => {
        const today = moment().format('YYMMDD');
        const result = await db.query(
            `SELECT 
                'CT-' || '${today}' || '-' || 
                LPAD(COALESCE(MAX(SUBSTRING(booking_number FROM 10)::INTEGER), 0) + 1, 5, '0') as next_number 
             FROM bookings 
             WHERE booking_number LIKE 'CT-${today}-%'`
        );
        
        return result.rows[0].next_number || `CT-${today}-00001`;
    },

    // Find booking by ID
    findById: async (id) => {
        const result = await db.query(
            `SELECT 
                b.*,
                t.title, t.slug, t.location, t.start_date, t.end_date,
                u.name as user_name, u.email as user_email, u.phone as user_phone
             FROM bookings b
             JOIN tours t ON b.tour_id = t.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = $1`,
            [id]
        );
        
        return result.rows[0];
    },

    // Find booking by booking number
    findByBookingNumber: async (bookingNumber) => {
        const result = await db.query(
            `SELECT 
                b.*,
                t.title, t.slug, t.location,
                u.name as user_name, u.email as user_email
             FROM bookings b
             JOIN tours t ON b.tour_id = t.id
             JOIN users u ON b.user_id = u.id
             WHERE b.booking_number = $1`,
            [bookingNumber]
        );
        
        return result.rows[0];
    },

    // Get user bookings
    findByUser: async (userId, options = {}) => {
        const { page = 1, limit = 10, status } = options;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                b.*,
                t.title, t.slug, t.location,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as tour_image
            FROM bookings b
            JOIN tours t ON b.tour_id = t.id
            WHERE b.user_id = $1
        `;
        
        const values = [userId];
        let paramCount = 2;

        if (status) {
            query += ` AND b.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }

        query += ` ORDER BY b.booked_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        values.push(limit, offset);

        const result = await db.query(query, values);
        return result.rows;
    },

    // Count user bookings
    countByUser: async (userId, status = null) => {
        let query = 'SELECT COUNT(*) FROM bookings WHERE user_id = $1';
        const values = [userId];

        if (status) {
            query += ' AND status = $2';
            values.push(status);
        }

        const result = await db.query(query, values);
        return parseInt(result.rows[0].count);
    },

    // Get all bookings with filters
    findAll: async (options = {}) => {
        const {
            page = 1,
            limit = 20,
            status,
            tour_id,
            user_id,
            start_date,
            end_date,
            search
        } = options;
        
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                b.*,
                t.title as tour_title,
                t.slug as tour_slug,
                u.name as user_name,
                u.email as user_email
            FROM bookings b
            JOIN tours t ON b.tour_id = t.id
            JOIN users u ON b.user_id = u.id
            WHERE 1=1
        `;
        
        const values = [];
        let paramCount = 1;

        if (status) {
            query += ` AND b.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }

        if (tour_id) {
            query += ` AND b.tour_id = $${paramCount}`;
            values.push(tour_id);
            paramCount++;
        }

        if (user_id) {
            query += ` AND b.user_id = $${paramCount}`;
            values.push(user_id);
            paramCount++;
        }

        if (start_date) {
            query += ` AND DATE(b.booked_at) >= $${paramCount}`;
            values.push(start_date);
            paramCount++;
        }

        if (end_date) {
            query += ` AND DATE(b.booked_at) <= $${paramCount}`;
            values.push(end_date);
            paramCount++;
        }

        if (search) {
            query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR b.booking_number ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }

        query += ` ORDER BY b.booked_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        values.push(limit, offset);

        const result = await db.query(query, values);
        return result.rows;
    },

    // Count all bookings with filters
    countAll: async (filters = {}) => {
        let query = 'SELECT COUNT(*) FROM bookings b WHERE 1=1';
        const values = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND b.status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }

        if (filters.tour_id) {
            query += ` AND b.tour_id = $${paramCount}`;
            values.push(filters.tour_id);
            paramCount++;
        }

        if (filters.user_id) {
            query += ` AND b.user_id = $${paramCount}`;
            values.push(filters.user_id);
            paramCount++;
        }

        if (filters.start_date) {
            query += ` AND DATE(b.booked_at) >= $${paramCount}`;
            values.push(filters.start_date);
            paramCount++;
        }

        if (filters.end_date) {
            query += ` AND DATE(b.booked_at) <= $${paramCount}`;
            values.push(filters.end_date);
            paramCount++;
        }

        const result = await db.query(query, values);
        return parseInt(result.rows[0].count);
    },

    // Update booking
    update: async (id, bookingData) => {
        const { status, payment_status, special_requests, cancellation_reason } = bookingData;
        
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (status) {
            updates.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
            
            if (status === 'confirmed') {
                updates.push(`confirmed_at = CURRENT_TIMESTAMP`);
            } else if (status === 'cancelled') {
                updates.push(`cancelled_at = CURRENT_TIMESTAMP`);
            }
        }

        if (payment_status) {
            updates.push(`payment_status = $${paramCount}`);
            values.push(payment_status);
            paramCount++;
        }

        if (special_requests !== undefined) {
            updates.push(`special_requests = $${paramCount}`);
            values.push(special_requests);
            paramCount++;
        }

        if (cancellation_reason) {
            updates.push(`cancellation_reason = $${paramCount}`);
            values.push(cancellation_reason);
            paramCount++;
        }

        if (updates.length === 0) {
            return null;
        }

        values.push(id);
        const query = `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        
        const result = await db.query(query, values);
        return result.rows[0];
    },

    // Delete booking
    delete: async (id) => {
        // First get booking details to update tour booked count
        const booking = await Booking.findById(id);
        
        if (booking) {
            // Update tour booked count
            await db.query(
                'UPDATE tours SET booked_count = booked_count - $1 WHERE id = $2',
                [booking.people_count, booking.tour_id]
            );
        }

        const result = await db.query(
            'DELETE FROM bookings WHERE id = $1 RETURNING id',
            [id]
        );
        
        return result.rows[0];
    },

    // Get booking statistics
    getStats: async (filters = {}) => {
        let query = `
            SELECT 
                status,
                COUNT(*) as count,
                SUM(total_price) as total_amount
            FROM bookings
            WHERE 1=1
        `;
        
        const values = [];
        let paramCount = 1;

        if (filters.start_date) {
            query += ` AND booked_at >= $${paramCount}`;
            values.push(filters.start_date);
            paramCount++;
        }

        if (filters.end_date) {
            query += ` AND booked_at <= $${paramCount}`;
            values.push(filters.end_date);
            paramCount++;
        }

        query += ' GROUP BY status';
        
        const result = await db.query(query, values);
        
        const stats = {
            pending: 0,
            confirmed: 0,
            cancelled: 0,
            total: 0,
            revenue: 0
        };

        result.rows.forEach(row => {
            stats[row.status] = row.count;
            stats.total += row.count;
            if (row.status === 'confirmed') {
                stats.revenue += parseFloat(row.total_amount || 0);
            }
        });

        return stats;
    },

    // Get revenue analytics
    getRevenueAnalytics: async (period = 'month') => {
        let dateFormat, interval;
        
        switch (period) {
            case 'day':
                dateFormat = 'YYYY-MM-DD';
                interval = '1 day';
                break;
            case 'week':
                dateFormat = 'YYYY-WW';
                interval = '1 week';
                break;
            default: // month
                dateFormat = 'YYYY-MM';
                interval = '1 month';
                break;
        }

        const result = await db.query(
            `SELECT 
                TO_CHAR(DATE_TRUNC('${period}', booked_at), '${dateFormat}') as period,
                COUNT(*) as bookings_count,
                SUM(total_price) as revenue
             FROM bookings
             WHERE status = 'confirmed' AND booked_at >= CURRENT_DATE - INTERVAL '12 ${period}s'
             GROUP BY DATE_TRUNC('${period}', booked_at)
             ORDER BY period`
        );
        
        return result.rows;
    },

    // Get bookings by date range (for calendar)
    getByDateRange: async (startDate, endDate) => {
        const result = await db.query(
            `SELECT 
                b.*,
                t.title as tour_title,
                u.name as user_name
             FROM bookings b
             JOIN tours t ON b.tour_id = t.id
             JOIN users u ON b.user_id = u.id
             WHERE DATE(b.booked_at) BETWEEN $1 AND $2
             ORDER BY b.booked_at`,
            [startDate, endDate]
        );
        
        return result.rows;
    },

    // Check availability for a specific tour and date
    checkAvailability: async (tourId, date, peopleCount) => {
        const tour = await db.query(
            'SELECT capacity FROM tours WHERE id = $1',
            [tourId]
        );

        if (tour.rows.length === 0) {
            return { available: false, reason: 'Tour not found' };
        }

        const capacity = tour.rows[0].capacity;

        const booked = await db.query(
            `SELECT SUM(people_count) as total_booked 
             FROM bookings 
             WHERE tour_id = $1 AND booked_at::date = $2 AND status = 'confirmed'`,
            [tourId, date]
        );

        const totalBooked = parseInt(booked.rows[0].total_booked) || 0;
        const availableSlots = capacity - totalBooked;

        return {
            available: peopleCount <= availableSlots,
            available_slots: availableSlots,
            capacity: capacity,
            booked: totalBooked,
            requested: peopleCount
        };
    },

    // Get recent bookings
    getRecent: async (limit = 10) => {
        const result = await db.query(
            `SELECT 
                b.*,
                t.title as tour_title,
                u.name as user_name,
                u.email as user_email
             FROM bookings b
             JOIN tours t ON b.tour_id = t.id
             JOIN users u ON b.user_id = u.id
             ORDER BY b.booked_at DESC
             LIMIT $1`,
            [limit]
        );
        
        return result.rows;
    }
};

module.exports = Booking;