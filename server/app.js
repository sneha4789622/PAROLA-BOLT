const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');

const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const reelRoutes = require('./routes/reelRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const searchRoutes = require('./routes/searchRoutes');
const adminRoutes = require('./routes/adminRoutes');
const otpRoutes = require('./routes/otpRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const supportRoutes = require('./routes/supportRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

const createApp = (io) => {
  const app = express();

  app.use(helmet());
  app.use(mongoSanitize());
 const allowedOrigins = [
  "http://localhost:5173",
  "https://parola-project.vercel.app",
];

app.use(cors({
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(new URL(origin).hostname)
    ) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
}));
 
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

  // Attach Socket.IO to every request
  app.use((req, res, next) => { req.io = io; next(); });

  app.use('/api', apiLimiter);

  app.get('/api/health', (req, res) =>
    res.status(200).json({ success: true, message: 'Parola Bolt API is running.', timestamp: new Date() })
  );

  // Existing routes (unchanged)
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/reels', reelRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/admin', adminRoutes);

  // New routes
  app.use('/api/auth/otp', otpRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/verification', verificationRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
