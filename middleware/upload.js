const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const tourImagesDir = path.join(__dirname, '../public/uploads/tour-images');
const userAvatarsDir = path.join(__dirname, '../public/uploads/user-avatars');

[tourImagesDir, userAvatarsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage for tour images
const tourImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tourImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'tour-' + uniqueSuffix + ext);
    }
});

// Configure storage for user avatars
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, userAvatarsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

// File filter
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

// Create multer instances
const uploadTourImages = multer({
    storage: tourImageStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

module.exports = {
    uploadTourImages,
    uploadAvatar
};