const { body, param, query } = require('express-validator');

const validationRules = {
    // Auth validation
    register: [
        body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirm_password').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
    ],

    login: [
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],

    // Tour validation
    createTour: [
        body('title').trim().notEmpty().withMessage('Tour title is required'),
        body('short_description').trim().notEmpty().withMessage('Short description is required'),
        body('full_description').trim().notEmpty().withMessage('Full description is required'),
        body('location').trim().notEmpty().withMessage('Location is required'),
        body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
        body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
        body('duration_days').isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),
        body('start_date').isISO8601().withMessage('Valid start date is required'),
        body('end_date').isISO8601().withMessage('Valid end date is required')
            .custom((value, { req }) => {
                if (new Date(value) <= new Date(req.body.start_date)) {
                    throw new Error('End date must be after start date');
                }
                return true;
            })
    ],

    // Booking validation
    createBooking: [
        body('tour_date').isISO8601().withMessage('Valid tour date is required'),
        body('people_count').isInt({ min: 1, max: 20 }).withMessage('Number of people must be between 1 and 20')
    ],

    // Profile validation
    updateProfile: [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('phone').optional().trim().matches(/^[+]?[\d\s-]{10,}$/).withMessage('Valid phone number is required')
    ],

    changePassword: [
        body('current_password').notEmpty().withMessage('Current password is required'),
        body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
        body('confirm_password').custom((value, { req }) => {
            if (value !== req.body.new_password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
    ]
};

module.exports = validationRules;