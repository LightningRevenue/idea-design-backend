const express = require('express');
const router = express.Router();
const { register, login, createAdmin } = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/adminAuth');

// Register route (optional, for initial setup)
// PROTECT admin signup route: allow only if no admin exists
const Admin = require('../models/Admin');
router.post('/signup', async (req, res, next) => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(403).json({ success: false, message: 'Admin creation is disabled. Contact site owner.' });
    }
    // If no admin exists, allow registration
    return register(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Login route
router.post('/login', login);

// Admin verification endpoint
router.get('/verify', verifyAdmin, (req, res) => {
  console.log('Admin verification successful for:', req.user);
  res.json({ 
    success: true, 
    message: 'Token valid',
    user: {
      id: req.user.id || req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || 'admin'
    }
  });
});

// Route to create a new admin user
router.post('/create-admin', verifyAdmin, createAdmin);

// Comentate - aceste rute vor trebui implementate în viitor
// când vom crea funcțiile corespunzătoare în adminController

/*
// Product management routes
router.get('/products', verifyAdmin, adminController.getAllProducts);
router.post('/products', verifyAdmin, adminController.createProduct);
router.put('/products/:id', verifyAdmin, adminController.updateProduct);
router.delete('/products/:id', verifyAdmin, adminController.deleteProduct);

// Category management routes
router.get('/categories', verifyAdmin, adminController.getAllCategories);
router.post('/categories', verifyAdmin, adminController.createCategory);
router.put('/categories/:id', verifyAdmin, adminController.updateCategory);
router.delete('/categories/:id', verifyAdmin, adminController.deleteCategory);
*/

module.exports = router;
