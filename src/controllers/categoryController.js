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
    const { name, description, status, icon, showInNavbar, customSections, descriptionTitle, descriptionSubtitle, seoKeywords, seoText, seoTextTitle } = req.body;
    
    // Ensure an image was uploaded
    if (!req.uploadedUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vă rugăm să încărcați o imagine pentru categorie'
      });
    }
    
    // Get image URL from S3
    const image = req.uploadedUrl;
    
    // Parse customSections if it's a string (from FormData)
    let parsedCustomSections = [];
    if (customSections) {
      try {
        parsedCustomSections = typeof customSections === 'string' ? JSON.parse(customSections) : customSections;
      } catch (error) {
        console.error('Error parsing customSections:', error);
      }
    }
    
    // Parse seoKeywords if it's a string (from FormData)
    let parsedSeoKeywords = [];
    if (seoKeywords) {
      try {
        parsedSeoKeywords = typeof seoKeywords === 'string' ? JSON.parse(seoKeywords) : seoKeywords;
      } catch (error) {
        console.error('Error parsing seoKeywords:', error);
      }
    }
    
    // Create category
    const category = await Category.create({
      name,
      description,
      image,
      icon: icon || '',
      showInNavbar: showInNavbar === 'true' || showInNavbar === true,
      status: status || 'active',
      productCount: 0,
      customSections: parsedCustomSections,
      descriptionTitle: descriptionTitle || 'Despre produsele din această categorie',
      descriptionSubtitle: descriptionSubtitle || '',
      seoKeywords: parsedSeoKeywords,
      seoText: seoText || '',
      seoTextTitle: seoTextTitle || 'Despre produsele din această categorie'
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    // Note: For S3, we don't need to clean up files on error as they're already uploaded
    // In a production environment, you might want to implement S3 cleanup here
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
    
    // Parse customSections if it's a string (from FormData)
    let parsedCustomSections = category.customSections;
    if (req.body.customSections !== undefined) {
      try {
        parsedCustomSections = typeof req.body.customSections === 'string' ? 
          JSON.parse(req.body.customSections) : req.body.customSections;
      } catch (error) {
        console.error('Error parsing customSections:', error);
      }
    }
    
    // Parse seoKeywords if it's a string (from FormData)
    let parsedSeoKeywords = category.seoKeywords || [];
    if (req.body.seoKeywords !== undefined) {
      try {
        parsedSeoKeywords = typeof req.body.seoKeywords === 'string' ? 
          JSON.parse(req.body.seoKeywords) : req.body.seoKeywords;
      } catch (error) {
        console.error('Error parsing seoKeywords:', error);
      }
    }
    
    const updateData = {
      name: req.body.name || category.name,
      description: req.body.description || category.description,
      status: req.body.status || category.status,
      icon: req.body.icon !== undefined ? req.body.icon : category.icon,
      showInNavbar: req.body.showInNavbar !== undefined ? 
        (req.body.showInNavbar === 'true' || req.body.showInNavbar === true) : 
        category.showInNavbar,
      customSections: parsedCustomSections,
      descriptionTitle: req.body.descriptionTitle !== undefined ? req.body.descriptionTitle : category.descriptionTitle,
      descriptionSubtitle: req.body.descriptionSubtitle !== undefined ? req.body.descriptionSubtitle : category.descriptionSubtitle,
      seoKeywords: parsedSeoKeywords,
      seoText: req.body.seoText !== undefined ? req.body.seoText : category.seoText,
      seoTextTitle: req.body.seoTextTitle !== undefined ? req.body.seoTextTitle : category.seoTextTitle
    };
    
    // If a new image is uploaded, update the image URL
    if (req.uploadedUrl) {
      // Note: For S3, we don't delete old images automatically
      // You might want to implement S3 cleanup logic here
      updateData.image = req.uploadedUrl;
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
    // Note: For S3, we don't need to clean up files on error as they're already uploaded
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