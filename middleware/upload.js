const multer = require('multer');
const { tourImageStorage, userAvatarStorage } = require('../config/cloudinary');

const imageFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/)) {
        return cb(new Error('Only image and video files are allowed!'), false);
    }
    cb(null, true);
};

const uploadTourImages = multer({
    storage: tourImageStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 
    }
});

const uploadAvatar = multer({
    storage: userAvatarStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 20 * 1024 * 1024 
    }
});

module.exports = {
    uploadTourImages,
    uploadAvatar
};