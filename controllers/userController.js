const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const moment = require('moment');
const { storage } = require('../config/cloudinary');

const userController = {
    // GET /user/dashboard
    getDashboard: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.redirect('/auth/login');
            }

            const userId = req.session.user.id;

            // Get upcoming bookings
            const upcomingBookings = await db.query(
                `SELECT 
                    b.id, b.booking_number, b.people_count, b.total_price,
                    b.status, b.booked_at,
                    t.title, t.start_date, t.location,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as image
                 FROM bookings b
                 JOIN tours t ON b.tour_id = t.id
                 WHERE b.user_id = $1 AND b.status = 'confirmed' 
                 AND t.start_date >= CURRENT_DATE
                 ORDER BY t.start_date
                 LIMIT 3`,
                [userId]
            );

            // Get recent bookings
            const recentBookings = await db.query(
                `SELECT 
                    b.id, b.booking_number, b.status, b.booked_at, b.total_price,
                    t.title
                 FROM bookings b
                 JOIN tours t ON b.tour_id = t.id
                 WHERE b.user_id = $1
                 ORDER BY b.booked_at DESC
                 LIMIT 5`,
                [userId]
            );

            // Get favorite tours
            const favoriteTours = await db.query(
                `SELECT 
                    t.id, t.title, t.slug, t.price, t.discount_price,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as image
                 FROM tours t
                 JOIN favorites f ON t.id = f.tour_id
                 WHERE f.user_id = $1 AND t.status IN ('upcoming', 'available')
                 LIMIT 4`,
                [userId]
            );

            // Get user stats
            const statsQuery = await db.query(
                `SELECT 
                    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as total_trips,
                    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_trips,
                    SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as total_spent
                 FROM bookings b
                 WHERE b.user_id = $1`,
                [userId]
            );

            res.render('user/dashboard', {
                title: 'My Dashboard - Casalinga Tours',
                upcomingBookings: upcomingBookings.rows,
                recentBookings: recentBookings.rows,
                favoriteTours: favoriteTours.rows,
                stats: statsQuery.rows[0],
                moment
            });

        } catch (error) {
            console.error('Get user dashboard error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /user/profile
    getProfile: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.redirect('/auth/login');
            }

            const userId = req.session.user.id;

            const userQuery = await db.query(
                'SELECT id, name, email, phone, avatar_url, created_at FROM users WHERE id = $1',
                [userId]
            );

            if (userQuery.rows.length === 0) {
                return res.redirect('/auth/logout');
            }

            const user = userQuery.rows[0];

            res.render('user/profile', {
                title: 'My Profile - Casalinga Tours',
                user,
                moment
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /user/profile/update
    updateProfile: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Please login' });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false, 
                    errors: errors.array() 
                });
            }

            const userId = req.session.user.id;
            const { name, phone } = req.body;

            await db.query(
                'UPDATE users SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [name, phone, userId]
            );

            // Update session
            req.session.user.name = name;

            res.json({ 
                success: true, 
                message: 'Profile updated successfully' 
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'An error occurred while updating profile' 
            });
        }
    },

    // POST /user/profile/change-password
    changePassword: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Please login' });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false, 
                    errors: errors.array() 
                });
            }

            const userId = req.session.user.id;
            const { current_password, new_password } = req.body;

            // Get current password hash
            const userQuery = await db.query(
                'SELECT password_hash FROM users WHERE id = $1',
                [userId]
            );

            if (userQuery.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            // Verify current password
            const isValid = await bcrypt.compare(current_password, userQuery.rows[0].password_hash);
            if (!isValid) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Current password is incorrect' 
                });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(new_password, salt);

            // Update password
            await db.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newPasswordHash, userId]
            );

            res.json({ 
                success: true, 
                message: 'Password changed successfully' 
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'An error occurred while changing password' 
            });
        }
    },

    // GET /user/favorites
    getFavorites: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.redirect('/auth/login');
            }

            const userId = req.session.user.id;
            const { page = 1 } = req.query;
            const limit = 12;
            const offset = (page - 1) * limit;

            const favoritesQuery = await db.query(
                `SELECT 
                    t.id, t.title, t.slug, t.short_description, 
                    t.location, t.price, t.discount_price,
                    t.start_date, t.status,
                    (SELECT image_url FROM tour_images WHERE tour_id = t.id AND is_main = true LIMIT 1) as image,
                    f.created_at as favorited_at
                 FROM tours t
                 JOIN favorites f ON t.id = f.tour_id
                 WHERE f.user_id = $1 AND t.status IN ('upcoming', 'available')
                 ORDER BY f.created_at DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            );

            const countQuery = await db.query(
                'SELECT COUNT(*) FROM favorites WHERE user_id = $1',
                [userId]
            );

            const totalFavorites = parseInt(countQuery.rows[0].count);
            const totalPages = Math.ceil(totalFavorites / limit);

            res.render('user/favorites', {
                title: 'My Favorites - Casalinga Tours',
                favorites: favoritesQuery.rows,
                currentPage: parseInt(page),
                totalPages,
                totalFavorites,
                moment
            });

        } catch (error) {
            console.error('Get favorites error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // GET /user/notifications
    getNotifications: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.redirect('/auth/login');
            }

            const userId = req.session.user.id;

            const notificationsQuery = await db.query(
                `SELECT 
                    id, title, message, type, is_read, created_at
                 FROM notifications 
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT 20`,
                [userId]
            );

            // Mark as read
            await db.query(
                'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
                [userId]
            );

            res.render('user/notifications', {
                title: 'Notifications - Casalinga Tours',
                notifications: notificationsQuery.rows,
                moment
            });

        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).render('error/500', { title: 'Server Error' });
        }
    },

    // POST /user/notifications/:id/read
    markNotificationAsRead: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Please login' });
            }

            const { id } = req.params;
            const userId = req.session.user.id;

            await db.query(
                'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            res.json({ success: true });

        } catch (error) {
            console.error('Mark notification as read error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    }
};

module.exports = userController;