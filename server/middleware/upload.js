const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary using .env keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Dynamic folder — set req.uploadFolder before using middleware
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:          `buildr/${req.uploadFolder || 'general'}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    resource_type:   'auto',
    public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
  }),
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB max
  },
});

module.exports = upload;
