const Brand = require('../models/Brand');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for brand logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/brands/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Doar imagini sunt permise pentru logo!'));
    }
  }
});

// Get all brands
const getAllBrands = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    
    const query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const brands = await Brand.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Brand.countDocuments(query);

    res.json({
      success: true,
      data: brands,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la încărcarea brand-urilor',
      error: error.message
    });
  }
};

// Get all active brands (for dropdown and public pages)
const getActiveBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true })
      .select('name _id logo description website')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Error fetching active brands:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la încărcarea brand-urilor active',
      error: error.message
    });
  }
};

// Get brand by ID
const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand-ul nu a fost găsit'
      });
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la încărcarea brand-ului',
      error: error.message
    });
  }
};

// Create new brand
const createBrand = async (req, res) => {
  try {
    const { name, description, website, isActive } = req.body;
    
    // Check if brand name already exists
    const existingBrand = await Brand.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Un brand cu acest nume există deja'
      });
    }

    const brandData = {
      name: name.trim(),
      description: description?.trim(),
      website: website?.trim(),
      isActive: isActive !== undefined ? isActive : true
    };

    // Add logo if uploaded
    if (req.uploadedUrl) {
      brandData.logo = req.uploadedUrl;
    }

    const brand = new Brand(brandData);
    await brand.save();

    res.status(201).json({
      success: true,
      message: 'Brand creat cu succes',
      data: brand
    });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea brand-ului',
      error: error.message
    });
  }
};

// Update brand
const updateBrand = async (req, res) => {
  try {
    const { name, description, website, isActive } = req.body;
    
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand-ul nu a fost găsit'
      });
    }

    // Check if new name conflicts with existing brand
    if (name && name !== brand.name) {
      const existingBrand = await Brand.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: 'Un brand cu acest nume există deja'
        });
      }
    }

    // Update fields
    if (name) brand.name = name.trim();
    if (description !== undefined) brand.description = description.trim();
    if (website !== undefined) brand.website = website.trim();
    if (isActive !== undefined) brand.isActive = isActive;

    // Update logo if new one uploaded
    if (req.uploadedUrl) {
      // Note: For S3, we don't delete old images automatically
      brand.logo = req.uploadedUrl;
    }

    await brand.save();

    res.json({
      success: true,
      message: 'Brand actualizat cu succes',
      data: brand
    });
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea brand-ului',
      error: error.message
    });
  }
};

// Delete brand
const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand-ul nu a fost găsit'
      });
    }

    // Delete logo file if exists
    if (brand.logo && fs.existsSync(brand.logo)) {
      fs.unlinkSync(brand.logo);
    }

    await Brand.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Brand șters cu succes'
    });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea brand-ului',
      error: error.message
    });
  }
};

module.exports = {
  getAllBrands,
  getActiveBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  upload
}; 