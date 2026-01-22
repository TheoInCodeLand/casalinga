const db = require('../config/database');

const Tour = {
    // Create a new tour
    create: async (tourData) => {
        const {
            title, slug, short_description, full_description, location,
            price, discount_price, start_date, end_date, duration_days,
            capacity, status = 'upcoming', featured = false, created_by
        } = tourData;

        const result = await db.query(
            `INSERT INTO tours (
                title, slug, short_description, full_description, location,
                price, discount_price, start_date, end_date, duration_days,
                capacity, status, featured, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                title, slug, short_description, full_description, location,
                price, discount_price, start_date, end_date, duration_days,
                capacity, status, featured, created_by
            ]
        );
        
        return result.rows[0];
    },

    // Find tour by ID
    findById: async (id) => {
        const result = await db.query(
            `SELECT 
                t.*,
                u.name as created_by_name,
                u.email as created_by_email
             FROM tours t
             LEFT JOIN users u ON t.created_by = u.id
             WHERE t.id = $1`,
            [id]
        );
        
        return result.rows[0];
    },

    // Find tour by slug
    findBySlug: async (slug) => {
        const result = await db.query(
            `SELECT 
                t.*,
                u.name as created_by_name,
                u.email as created_by_email
             FROM tours t
             LEFT JOIN users u ON t.created_by = u.id
             WHERE t.slug = $1`,
            [slug]
        );
        
        return result.rows[0];
    },

    // Update tour
    update: async (id, tourData) => {
        const {
            title, short_description, full_description, location,
            price, discount_price, start_date, end_date, duration_days,
            capacity, status, featured
        } = tourData;

        const result = await db.query(
            `UPDATE tours SET
                title = $1,
                short_description = $2,
                full_description = $3,
                location = $4,
                price = $5,
                discount_price = $6,
                start_date = $7,
                end_date = $8,
                duration_days = $9,
                capacity = $10,
                status = $11,
                featured = $12,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $13
             RETURNING *`,
            [
                title, short_description, full_description, location,
                price, discount_price, start_date, end_date, duration_days,
                capacity, status, featured, id
            ]
        );
        
        return result.rows[0];
    },

    // Delete tour
    delete: async (id) => {
        const result = await db.query(
            'DELETE FROM tours WHERE id = $1 RETURNING id',
            [id]
        );
        
        return result.rows[0];
    },

    // Get all tours with filters
    findAll: async (options = {}) => {
        const {
            page = 1,
            limit = 12,
            status,
            featured,
            category,
            location,
            price_min,
            price_max,
            date,
            search
        } = options;
        
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                t.*,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
            FROM tours t
            WHERE 1=1
        `;
        
        const values = [];
        let paramCount = 1;

        if (status) {
            query += ` AND t.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }

        if (featured === true) {
            query += ` AND t.featured = true`;
        }

        if (category) {
            query += ` AND EXISTS (
                SELECT 1 FROM tour_categories tc 
                JOIN categories c ON tc.category_id = c.id 
                WHERE tc.tour_id = t.id AND c.id = $${paramCount}
            )`;
            values.push(category);
            paramCount++;
        }

        if (location) {
            query += ` AND t.location ILIKE $${paramCount}`;
            values.push(`%${location}%`);
            paramCount++;
        }

        if (price_min) {
            query += ` AND (t.discount_price >= $${paramCount} OR t.price >= $${paramCount})`;
            values.push(price_min);
            paramCount++;
        }

        if (price_max) {
            query += ` AND (t.discount_price <= $${paramCount} OR t.price <= $${paramCount})`;
            values.push(price_max);
            paramCount++;
        }

        if (date) {
            query += ` AND t.start_date >= $${paramCount}`;
            values.push(date);
            paramCount++;
        }

        if (search) {
            query += ` AND (t.title ILIKE $${paramCount} OR t.short_description ILIKE $${paramCount} OR t.location ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }

        query += ` ORDER BY t.featured DESC, t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        values.push(limit, offset);

        const result = await db.query(query, values);
        return result.rows;
    },

    // Count tours with filters
    count: async (filters = {}) => {
        let query = 'SELECT COUNT(*) FROM tours WHERE 1=1';
        const values = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }

        if (filters.featured === true) {
            query += ` AND featured = true`;
        }

        if (filters.category) {
            query += ` AND EXISTS (
                SELECT 1 FROM tour_categories tc 
                WHERE tc.tour_id = tours.id AND tc.category_id = $${paramCount}
            )`;
            values.push(filters.category);
            paramCount++;
        }

        if (filters.location) {
            query += ` AND location ILIKE $${paramCount}`;
            values.push(`%${filters.location}%`);
            paramCount++;
        }

        const result = await db.query(query, values);
        return parseInt(result.rows[0].count);
    },

    // Get featured tours
    getFeatured: async (limit = 6) => {
        const result = await db.query(
            `SELECT 
                t.*,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
             FROM tours t
             WHERE t.featured = true AND t.status IN ('upcoming', 'available')
             ORDER BY t.created_at DESC
             LIMIT $1`,
            [limit]
        );
        
        return result.rows;
    },

    // Get tours by category
    findByCategory: async (categoryId, options = {}) => {
        const { page = 1, limit = 12 } = options;
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT 
                t.*,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
             FROM tours t
             JOIN tour_categories tc ON t.id = tc.tour_id
             WHERE tc.category_id = $1 AND t.status IN ('upcoming', 'available')
             ORDER BY t.created_at DESC
             LIMIT $2 OFFSET $3`,
            [categoryId, limit, offset]
        );
        
        return result.rows;
    },

    // Get similar tours
    getSimilar: async (tourId, limit = 4) => {
        const result = await db.query(
            `SELECT DISTINCT 
                t.id, t.title, t.slug, t.short_description, t.price,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
             FROM tours t
             JOIN tour_categories tc ON t.id = tc.tour_id
             WHERE tc.category_id IN (
                 SELECT category_id FROM tour_categories WHERE tour_id = $1
             ) AND t.id != $1 AND t.status IN ('upcoming', 'available')
             ORDER BY t.created_at DESC
             LIMIT $2`,
            [tourId, limit]
        );
        
        return result.rows;
    },

    // Get tour images
    getImages: async (tourId) => {
        const result = await db.query(
            'SELECT * FROM tour_images WHERE tour_id = $1 ORDER BY display_order',
            [tourId]
        );
        
        return result.rows;
    },

    // Add tour image
    addImage: async (tourId, imageData) => {
        const { image_url, alt_text, is_main = false, display_order = 0 } = imageData;
        
        const result = await db.query(
            `INSERT INTO tour_images (tour_id, image_url, alt_text, is_main, display_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [tourId, image_url, alt_text, is_main, display_order]
        );
        
        return result.rows[0];
    },

    // Remove tour image
    removeImage: async (imageId) => {
        const result = await db.query(
            'DELETE FROM tour_images WHERE id = $1 RETURNING image_url',
            [imageId]
        );
        
        return result.rows[0];
    },

    // Get tour amenities
    getAmenities: async (tourId) => {
        const result = await db.query(
            `SELECT a.* 
             FROM amenities a
             JOIN tour_amenities ta ON a.id = ta.amenity_id
             WHERE ta.tour_id = $1
             ORDER BY a.name`,
            [tourId]
        );
        
        return result.rows;
    },

    // Get tour categories
    getCategories: async (tourId) => {
        const result = await db.query(
            `SELECT c.* 
             FROM categories c
             JOIN tour_categories tc ON c.id = tc.category_id
             WHERE tc.tour_id = $1
             ORDER BY c.name`,
            [tourId]
        );
        
        return result.rows;
    },

    // Add categories to tour
    addCategories: async (tourId, categoryIds) => {
        const values = categoryIds.map(catId => `('${tourId}', '${catId}')`).join(',');
        
        const result = await db.query(
            `INSERT INTO tour_categories (tour_id, category_id) 
             VALUES ${values}
             ON CONFLICT (tour_id, category_id) DO NOTHING`
        );
        
        return result;
    },

    // Add amenities to tour
    addAmenities: async (tourId, amenityIds) => {
        const values = amenityIds.map(amenityId => `('${tourId}', '${amenityId}')`).join(',');
        
        const result = await db.query(
            `INSERT INTO tour_amenities (tour_id, amenity_id) 
             VALUES ${values}
             ON CONFLICT (tour_id, amenity_id) DO NOTHING`
        );
        
        return result;
    },

    // Remove categories from tour
    removeCategories: async (tourId) => {
        const result = await db.query(
            'DELETE FROM tour_categories WHERE tour_id = $1',
            [tourId]
        );
        
        return result;
    },

    // Remove amenities from tour
    removeAmenities: async (tourId) => {
        const result = await db.query(
            'DELETE FROM tour_amenities WHERE tour_id = $1',
            [tourId]
        );
        
        return result;
    },

    // Update tour status
    updateStatus: async (tourId, status) => {
        const result = await db.query(
            `UPDATE tours 
             SET status = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING id, title, status`,
            [status, tourId]
        );
        
        return result.rows[0];
    },

    // Get available slots for a specific date
    getAvailableSlots: async (tourId, date) => {
        const tourResult = await db.query(
            'SELECT capacity, booked_count FROM tours WHERE id = $1',
            [tourId]
        );

        if (tourResult.rows.length === 0) {
            return null;
        }

        const tour = tourResult.rows[0];

        const bookedResult = await db.query(
            `SELECT SUM(people_count) as total_booked 
             FROM bookings 
             WHERE tour_id = $1 AND booked_at::date = $2 AND status = 'confirmed'`,
            [tourId, date]
        );

        const totalBooked = parseInt(bookedResult.rows[0].total_booked) || 0;
        const availableSlots = tour.capacity - totalBooked;

        return {
            capacity: tour.capacity,
            booked: totalBooked,
            available: availableSlots
        };
    },

    // Get popular tours (most booked)
    getPopular: async (limit = 5) => {
        const result = await db.query(
            `SELECT 
                t.id, t.title, t.slug, t.price,
                COUNT(b.id) as bookings_count,
                SUM(b.total_price) as revenue,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image
             FROM tours t
             LEFT JOIN bookings b ON t.id = b.tour_id AND b.status = 'confirmed'
             WHERE t.status IN ('upcoming', 'available')
             GROUP BY t.id, t.title, t.slug, t.price
             ORDER BY bookings_count DESC
             LIMIT $1`,
            [limit]
        );
        
        return result.rows;
    }
};

module.exports = Tour;