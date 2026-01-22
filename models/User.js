const db = require('../config/database');

const User = {
    // Create a new user
    create: async (userData) => {
        const { name, email, password_hash, phone, role = 'user' } = userData;
        
        const result = await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, name, email, role, phone, created_at`,
            [name, email, password_hash, phone, role]
        );
        
        return result.rows[0];
    },

    // Find user by email
    findByEmail: async (email) => {
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        return result.rows[0];
    },

    // Find user by ID
    findById: async (id) => {
        const result = await db.query(
            'SELECT id, name, email, phone, avatar_url, role, created_at, is_active FROM users WHERE id = $1',
            [id]
        );
        
        return result.rows[0];
    },

    // Update user
    update: async (id, userData) => {
        const { name, phone, avatar_url } = userData;
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }

        if (phone) {
            updates.push(`phone = $${paramCount}`);
            values.push(phone);
            paramCount++;
        }

        if (avatar_url) {
            updates.push(`avatar_url = $${paramCount}`);
            values.push(avatar_url);
            paramCount++;
        }

        if (updates.length === 0) {
            return null;
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        
        const result = await db.query(query, values);
        return result.rows[0];
    },

    // Update password
    updatePassword: async (id, password_hash) => {
        const result = await db.query(
            `UPDATE users 
             SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING id`,
            [password_hash, id]
        );
        
        return result.rows[0];
    },

    // Update user role (admin only)
    updateRole: async (id, role) => {
        const result = await db.query(
            `UPDATE users 
             SET role = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING id, name, email, role`,
            [role, id]
        );
        
        return result.rows[0];
    },

    // Delete user (soft delete)
    delete: async (id) => {
        const result = await db.query(
            `UPDATE users 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 
             RETURNING id`,
            [id]
        );
        
        return result.rows[0];
    },

    // Get all users with pagination
    findAll: async (options = {}) => {
        const { page = 1, limit = 20, role, search } = options;
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
        
        const values = [];
        let paramCount = 1;

        if (role) {
            query += ` AND u.role = $${paramCount}`;
            values.push(role);
            paramCount++;
        }

        if (search) {
            query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }

        query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        values.push(limit, offset);

        const result = await db.query(query, values);
        return result.rows;
    },

    // Count total users
    count: async (filters = {}) => {
        let query = 'SELECT COUNT(*) FROM users WHERE is_active = true';
        const values = [];
        let paramCount = 1;

        if (filters.role) {
            query += ` AND role = $${paramCount}`;
            values.push(filters.role);
            paramCount++;
        }

        const result = await db.query(query, values);
        return parseInt(result.rows[0].count);
    },

    // Get user statistics
    getStats: async (userId) => {
        const result = await db.query(
            `SELECT 
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as total_trips,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_trips,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
                SUM(CASE WHEN status = 'confirmed' THEN total_price ELSE 0 END) as total_spent
             FROM bookings 
             WHERE user_id = $1`,
            [userId]
        );
        
        return result.rows[0];
    },

    // Get user favorites
    getFavorites: async (userId, options = {}) => {
        const { page = 1, limit = 12 } = options;
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT 
                t.*,
                (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as main_image,
                f.created_at as favorited_at
             FROM favorites f
             JOIN tours t ON f.tour_id = t.id
             WHERE f.user_id = $1 AND t.status IN ('upcoming', 'available')
             ORDER BY f.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        
        return result.rows;
    },

    // Count user favorites
    countFavorites: async (userId) => {
        const result = await db.query(
            `SELECT COUNT(*) 
             FROM favorites f
             JOIN tours t ON f.tour_id = t.id
             WHERE f.user_id = $1 AND t.status IN ('upcoming', 'available')`,
            [userId]
        );
        
        return parseInt(result.rows[0].count);
    },

    // Add to favorites
    addFavorite: async (userId, tourId) => {
        try {
            const result = await db.query(
                `INSERT INTO favorites (user_id, tour_id) 
                 VALUES ($1, $2) 
                 ON CONFLICT (user_id, tour_id) DO NOTHING
                 RETURNING *`,
                [userId, tourId]
            );
            
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                return null;
            }
            throw error;
        }
    },

    // Remove from favorites
    removeFavorite: async (userId, tourId) => {
        const result = await db.query(
            `DELETE FROM favorites 
             WHERE user_id = $1 AND tour_id = $2 
             RETURNING *`,
            [userId, tourId]
        );
        
        return result.rows[0];
    },

    // Check if tour is favorite
    isFavorite: async (userId, tourId) => {
        const result = await db.query(
            'SELECT 1 FROM favorites WHERE user_id = $1 AND tour_id = $2',
            [userId, tourId]
        );
        
        return result.rows.length > 0;
    }
};

module.exports = User;