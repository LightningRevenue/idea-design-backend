const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  updateProductCount
} = require('../controllers/categoryController');
const { verifyAdmin } = require('../middleware/adminAuth');

// Middleware pentru compresie imagini categorii
const uploadAndCompress = (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return next(err);
    }
    
    // Aplică compresie dacă există un fișier încărcat
    if (req.file) {
      // Transformă req.file în req.files pentru a fi compatibil cu compressImages
      req.files = [req.file];
      await compressImages(req, res, () => {});
      // Returnează la req.file pentru compatibilitate
      req.file = req.files[0];
      delete req.files;
    }
    
    next();
  });
};

// Get all categories & Create a new category
router.route('/')
  .get(getCategories)
  .post(verifyAdmin, upload.single('image'), createCategory);

// Get, update and delete a single category
router.route('/:id')
  .get(getCategory)
  .put(verifyAdmin, upload.single('image'), updateCategory)
  .delete(verifyAdmin, deleteCategory);

// Update product count for a category
router.route('/:id/product-count')
  .put(verifyAdmin, updateProductCount);

module.exports = router; 