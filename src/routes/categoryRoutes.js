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