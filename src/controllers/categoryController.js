const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria nu a fost găsită'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, status, icon, showInNavbar } = req.body;
    
    // Ensure an image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vă rugăm să încărcați o imagine pentru categorie'
      });
    }
    
    // Get image path relative to the server
    const image = `/uploads/categories/${req.file.filename}`;
    
    // Create category
    const category = await Category.create({
      name,
      description,
      image,
      icon: icon || '',
      showInNavbar: showInNavbar === 'true' || showInNavbar === true,
      status: status || 'active',
      productCount: 0
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    // Delete uploaded image if category creation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria nu a fost găsită'
      });
    }
    
    const updateData = {
      name: req.body.name || category.name,
      description: req.body.description || category.description,
      status: req.body.status || category.status,
      icon: req.body.icon !== undefined ? req.body.icon : category.icon,
      showInNavbar: req.body.showInNavbar !== undefined ? 
        (req.body.showInNavbar === 'true' || req.body.showInNavbar === true) : 
        category.showInNavbar
    };
    
    // If a new image is uploaded, update the image path
    if (req.file) {
      // Delete old image if it exists
      const oldImagePath = path.join(__dirname, '../..', category.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      
      updateData.image = `/uploads/categories/${req.file.filename}`;
    }
    
    // Update category
    category = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    // Delete uploaded image if category update fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria nu a fost găsită'
      });
    }
    
    // Delete category image from file system
    const imagePath = path.join(__dirname, '../..', category.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    await category.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product count
// @route   PUT /api/categories/:id/product-count
// @access  Private
exports.updateProductCount = async (req, res, next) => {
  try {
    const { productCount } = req.body;
    
    if (productCount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Numărul de produse este necesar'
      });
    }
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { productCount },
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria nu a fost găsită'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
}; 