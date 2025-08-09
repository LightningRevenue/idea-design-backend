const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Import routes
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const brandRoutes = require('./src/routes/brandRoutes'); // Import brand routes
const adminRoutes = require('./src/routes/adminRoutes');
const userRoutes = require('./src/routes/userRoutes'); // Added user routes
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes'); // Import order routes
const consultationQuestionRoutes = require('./src/routes/consultationQuestionRoutes'); // Import consultation question routes
const consultationRoutes = require('./src/routes/consultationRoutes'); // Import consultation routes
const architectPartnershipRoutes = require('./src/routes/architectPartnershipRoutes'); // Import architect partnership routes
const bulkImportRoutes = require('./src/routes/bulkImportRoutes'); // Import bulk import routes
const inspirationRoutes = require('./src/routes/inspirationRoutes'); // Import inspiration routes
const offerRoutes = require('./src/routes/offerRoutes'); // Import offer routes
const analyticsRoutes = require('./src/routes/analyticsRoutes'); // Import analytics routes
const contactRoutes = require('./src/routes/contactRoutes'); // Import contact routes
const {
  rendertronMiddleware,
} = require('./src/middleware/rendertronMiddleware'); // Import Rendertron middleware
const homepageCategoryRoutes = require('./src/routes/homepageCategoryRoutes');

// Load environment variables
dotenv.config();

console.log('After dotenv.config(), MONGODB_URI is:', process.env.MONGODB_URI); // Debug log

const app = express();

// CORS configuration - only allow specific domains
const corsOptions = {
  origin: [
    'http://localhost:5173', // Vite dev server
    'https://localhost:5173', // Vite dev server HTTPS
    'http://www.idea-design.ro', // Production domain
    'https://www.idea-design.ro', // Production domain HTTPS
    'http://idea-design.ro', // Production domain without www
    'https://idea-design.ro',
    'http://localhost:4173',
  ],
  credentials: true, // Allow cookies and auth headers
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Toate rutele sunt acum gestionate de catch-all route-ul de mai jos

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
console.log(
  'Before mongoose.connect, MONGODB_URI is:',
  process.env.MONGODB_URI
); // Debug log
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(error => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes); // Add brand routes
app.use('/api/admin', adminRoutes); // Admin login/signup
app.use('/api/users', userRoutes); // Added user routes
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes); // Add order routes
app.use('/api/intrebari-consultanta', consultationQuestionRoutes); // Add consultation question routes
app.use('/api/consultatii', consultationRoutes); // Add consultation routes
app.use('/api/architect-partnerships', architectPartnershipRoutes); // Add architect partnership routes
app.use('/api/bulk-import', bulkImportRoutes); // Add bulk import routes
app.use('/api/inspiration', inspirationRoutes); // Add inspiration routes
app.use('/api/offers', offerRoutes); // Add offer routes
app.use('/api/analytics', analyticsRoutes); // Add analytics routes
app.use('/api/contact', contactRoutes); // Add contact routes
app.use('/api/homepage-categories', homepageCategoryRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Catch-all middleware pentru ORICE pagină care nu este API
app.use((req, res, next) => {
  // Skip rutele API și fișierele statice
  if (
    req.originalUrl.startsWith('/api/') ||
    req.originalUrl.startsWith('/uploads/') ||
    req.originalUrl === '/favicon.ico' ||
    req.originalUrl === '/robots.txt' ||
    req.originalUrl === '/sitemap.xml'
  ) {
    return next();
  }

  // Doar pentru GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Aplică middleware-ul Rendertron pentru toate celelalte rute
  rendertronMiddleware(req, res, () => {
    // Dacă nu este crawler, redirecționează către frontend
    res.redirect(`https://www.idea-design.ro${req.originalUrl}`);
  });
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
