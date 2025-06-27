const express = require('express');
const router = express.Router();
const { 
  getAllBrands, 
  getActiveBrands,
  getBrandById, 
  createBrand, 
  updateBrand, 
  deleteBrand,
  upload
} = require('../controllers/brandController');
const { verifyAdmin } = require('../middleware/adminAuth');

// Public routes
router.get('/active', getActiveBrands); // For dropdown in forms

// Protected admin routes
router.use(verifyAdmin); // All routes below require admin authentication

router.get('/', getAllBrands);
router.get('/:id', getBrandById);
const { uploadAndProcessBrandLogo } = require('../middleware/s3Upload');

router.post('/', uploadAndProcessBrandLogo, createBrand);
router.put('/:id', uploadAndProcessBrandLogo, updateBrand);
router.delete('/:id', deleteBrand);

module.exports = router; 