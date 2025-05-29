const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Import routes
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const userRoutes = require('./src/routes/userRoutes'); // Added user routes
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes'); // Import order routes
const consultationQuestionRoutes = require('./src/routes/consultationQuestionRoutes'); // Import consultation question routes
const consultationRoutes = require('./src/routes/consultationRoutes'); // Import consultation routes
const architectPartnershipRoutes = require('./src/routes/architectPartnershipRoutes'); // Import architect partnership routes

// Load environment variables
dotenv.config();

console.log('After dotenv.config(), MONGODB_URI is:', process.env.MONGODB_URI); // Debug log

const app = express();

// CORS configuration - only allow specific domains
const corsOptions = {
  origin: [
    'http://localhost:5173',           // Vite dev server
    'https://localhost:5173',          // Vite dev server HTTPS
    'http://www.idea-design.ro',       // Production domain
    'https://www.idea-design.ro',      // Production domain HTTPS
    'http://idea-design.ro',           // Production domain without www
    'https://idea-design.ro',
    'https://purple-moss-02db17003.6.azurestaticapps.net/'           // Production domain without www HTTPS
  ],
  credentials: true,                   // Allow cookies and auth headers
  optionsSuccessStatus: 200           // Some legacy browsers choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
console.log('Before mongoose.connect, MONGODB_URI is:', process.env.MONGODB_URI); // Debug log
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes); // Admin login/signup
app.use('/api/users', userRoutes); // Added user routes
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes); // Add order routes
app.use('/api/intrebari-consultanta', consultationQuestionRoutes); // Add consultation question routes
app.use('/api/consultatii', consultationRoutes); // Add consultation routes
app.use('/api/architect-partnerships', architectPartnershipRoutes); // Add architect partnership routes

// Base route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Error handler middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
