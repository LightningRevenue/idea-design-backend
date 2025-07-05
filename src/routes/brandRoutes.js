const express = require('express');
const router = express.Router();
const { 
  getAllBrands, 
  getActiveBrands,
  getBrandById, 
  createBrand, 
  updateBrand, 
  updateBrandOrder,
  deleteBrand
} = require('../controllers/brandController');
const { verifyAdmin } = require('../middleware/adminAuth');
const { uploadAndProcessBrandLogo } = require('../middleware/s3Upload');

// Public routes
router.get('/active', getActiveBrands); // For dropdown in forms

// Protected admin routes
router.use(verifyAdmin); // All routes below require admin authentication

// Routes for all brands
router.route('/')
  .get(getAllBrands)
  .post(uploadAndProcessBrandLogo, createBrand);

// Routes for a single brand
router.route('/:id')
  .get(getBrandById)
  .put(uploadAndProcessBrandLogo, updateBrand)
  .delete(deleteBrand);

// Route for updating display order
router.route('/:id/order').put(updateBrandOrder);

module.exports = router; 