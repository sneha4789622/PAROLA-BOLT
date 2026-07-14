const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Generic storage for posts/reels/profile media
const storage = new CloudinaryStorage({
  
  cloudinary,
  params: async (req, file) => {
    // Cloudinary has no separate "audio" resource_type — audio files
    // (like voice notes recorded as audio/webm) must also use "video".
    // Only leftover file types fall back to "image".
    const isAudioOrVideo = file.mimetype.startsWith('video') || file.mimetype.startsWith('audio');
    return {
      folder: 'parola-bolt',
      resource_type: isAudioOrVideo ? 'video' : 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm', 'mp3', 'm4a', 'ogg', 'wav'],
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

module.exports = { cloudinary, upload };
