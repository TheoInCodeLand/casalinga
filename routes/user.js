const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const bookingController = require('../controllers/bookingController');
const { isUser } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const validationRules = require('../middleware/validation');

// User dashboard
router.get('/dashboard', isUser, userController.getDashboard);

// Profile management
router.get('/profile', isUser, userController.getProfile);
router.post('/profile/update', isUser, validationRules.updateProfile, userController.updateProfile);
router.post('/profile/change-password', isUser, validationRules.changePassword, userController.changePassword);

// Avatar upload
router.post('/profile/avatar', isUser, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            req.session.error = 'Please select an image to upload';
            return res.redirect('/user/profile');
        }

        const avatarUrl = `/uploads/user-avatars/${req.file.filename}`;
        
        // Update user avatar in database
        await db.query(
            'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [avatarUrl, req.session.user.id]
        );

        // Update session
        req.session.user.avatar = avatarUrl;

        req.session.success = 'Profile picture updated successfully';
        res.redirect('/user/profile');
    } catch (error) {
        console.error('Avatar upload error:', error);
        req.session.error = 'An error occurred while uploading avatar';
        res.redirect('/user/profile');
    }
});

// Booking management
router.get('/bookings', isUser, bookingController.getUserBookings);
router.get('/bookings/:id', isUser, bookingController.getBookingDetails);
router.post('/bookings/:id/cancel', isUser, bookingController.cancelBooking);

// Favorites
router.get('/favorites', isUser, userController.getFavorites);

// Notifications
router.get('/notifications', isUser, userController.getNotifications);
router.post('/notifications/:id/read', isUser, userController.markNotificationAsRead);

// Settings
router.get('/settings', isUser, (req, res) => {
    res.render('user/settings', {
        title: 'Account Settings - Casalinga Tours'
    });
});

// Delete account (soft delete)
router.post('/delete-account', isUser, async (req, res) => {
    try {
        const { confirm_password } = req.body;
        const userId = req.session.user.id;

        // Verify password
        const user = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (user.rows.length === 0) {
            req.session.error = 'User not found';
            return res.redirect('/user/settings');
        }

        const isValid = await bcrypt.compare(confirm_password, user.rows[0].password_hash);
        if (!isValid) {
            req.session.error = 'Incorrect password';
            return res.redirect('/user/settings');
        }

        // Soft delete user
        await db.query(
            `UPDATE users 
             SET is_active = false, email = CONCAT(email, '_deleted_', EXTRACT(EPOCH FROM NOW()))
             WHERE id = $1`,
            [userId]
        );

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.redirect('/');
        });

    } catch (error) {
        console.error('Delete account error:', error);
        req.session.error = 'An error occurred while deleting account';
        res.redirect('/user/settings');
    }
});

module.exports = router;