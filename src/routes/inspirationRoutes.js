const express = require('express');
const router = express.Router();
const Inspiration = require('../models/Inspiration');
const path = require('path');
const fs = require('fs');
const { verifyAdmin } = require('../middleware/adminAuth');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// --- Multer configuration for Inspiration Images ---
const inspirationImagesDir = path.join(__dirname, '../../uploads/inspiration_images');
if (!fs.existsSync(inspirationImagesDir)) {
    fs.mkdirSync(inspirationImagesDir, { recursive: true });
}

const inspirationImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, inspirationImagesDir);
    },
    filename: (req, file, cb) => {
        const fileName = uuidv4() + path.extname(file.originalname);
        cb(null, fileName);
    }
});

const inspirationImageFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        req.fileValidationError = 'Tip de fișier invalid. Sunt permise doar fișiere JPEG, PNG, JPG, WEBP.';
        cb(null, false);
    }
};

const inspirationImageUpload = multer({
    storage: inspirationImageStorage,
    fileFilter: inspirationImageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
}).single('image');

// @route   GET /api/inspiration
// @desc    Get all inspiration items (public endpoint - only active items)
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Check if this is an admin request
    const isAdminRequest = req.headers.authorization && req.headers.authorization.startsWith('Bearer');
    
    let query = {};
    if (!isAdminRequest) {
      query.status = 'active';
    }
    
    const { category, tags, featured } = req.query;
    
    // Add filters if provided
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    const inspirationItems = await Inspiration.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: inspirationItems.length,
      data: inspirationItems
    });
  } catch (err) {
    console.error('Error in GET /api/inspiration:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/inspiration/admin/all
// @desc    Get all inspiration items (for admin use - includes draft, archived, etc.)
// @access  Private (admin only)
router.get('/admin/all', verifyAdmin, async (req, res) => {
  try {
    const inspirationItems = await Inspiration.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: inspirationItems.length,
      data: inspirationItems
    });
  } catch (err) {
    console.error('Error in GET /api/inspiration/admin/all:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/inspiration/:id
// @desc    Get single inspiration item by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const inspirationItem = await Inspiration.findById(req.params.id);
    
    if (!inspirationItem) {
      return res.status(404).json({ success: false, message: 'Inspiration item not found' });
    }
    
    // Increment view count
    inspirationItem.viewCount += 1;
    await inspirationItem.save();
    
    res.json({
      success: true,
      data: inspirationItem
    });
  } catch (err) {
    console.error('Error in GET /api/inspiration/:id:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/inspiration
// @desc    Create new inspiration item
// @access  Private (admin only)
router.post('/', verifyAdmin, (req, res) => {
  inspirationImageUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    if (req.fileValidationError) {
      return res.status(400).json({ success: false, message: req.fileValidationError });
    }
    
    try {
      const { title, description, tags, category, status, featured } = req.body;
      
      // Parse tags if it's a string
      let parsedTags = [];
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) {
          parsedTags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
        }
      }
      
      const inspirationData = {
        title,
        description: description || '',
        tags: parsedTags,
        category: category || 'alte',
        status: status || 'draft',
        featured: featured === 'true' || featured === true
      };
      
      // Handle image upload
      if (req.file) {
        inspirationData.image = `uploads/inspiration_images/${req.file.filename}`;
      }
      
      const inspirationItem = await Inspiration.create(inspirationData);
      
      res.status(201).json({
        success: true,
        message: 'Inspiration item created successfully',
        data: inspirationItem
      });
    } catch (err) {
      console.error('Error creating inspiration item:', err.message);
      res.status(400).json({ success: false, message: err.message });
    }
  });
});

// @route   PUT /api/inspiration/:id
// @desc    Update inspiration item
// @access  Private (admin only)
router.put('/:id', verifyAdmin, (req, res) => {
  inspirationImageUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    if (req.fileValidationError) {
      return res.status(400).json({ success: false, message: req.fileValidationError });
    }
    
    try {
      const inspirationItem = await Inspiration.findById(req.params.id);
      
      if (!inspirationItem) {
        return res.status(404).json({ success: false, message: 'Inspiration item not found' });
      }
      
      const { title, description, tags, category, status, featured } = req.body;
      
      // Parse tags if it's a string
      let parsedTags = [];
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) {
          parsedTags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
        }
      }
      
      const updateData = {
        title: title || inspirationItem.title,
        description: description !== undefined ? description : inspirationItem.description,
        tags: parsedTags.length > 0 ? parsedTags : inspirationItem.tags,
        category: category || inspirationItem.category,
        status: status || inspirationItem.status,
        featured: featured !== undefined ? (featured === 'true' || featured === true) : inspirationItem.featured
      };
      
      // Handle image upload
      if (req.file) {
        // Delete old image if it exists
        if (inspirationItem.image && inspirationItem.image !== 'uploads/default/no-photo.jpg') {
          const oldImagePath = path.join(__dirname, '../../', inspirationItem.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        updateData.image = `uploads/inspiration_images/${req.file.filename}`;
      }
      
      const updatedInspirationItem = await Inspiration.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );
      
      res.json({
        success: true,
        message: 'Inspiration item updated successfully',
        data: updatedInspirationItem
      });
    } catch (err) {
      console.error('Error updating inspiration item:', err.message);
      res.status(400).json({ success: false, message: err.message });
    }
  });
});

// @route   DELETE /api/inspiration/:id
// @desc    Delete inspiration item
// @access  Private (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const inspirationItem = await Inspiration.findById(req.params.id);
    
    if (!inspirationItem) {
      return res.status(404).json({ success: false, message: 'Inspiration item not found' });
    }
    
    // Delete image file if it exists
    if (inspirationItem.image && inspirationItem.image !== 'uploads/default/no-photo.jpg') {
      const imagePath = path.join(__dirname, '../../', inspirationItem.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Inspiration.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Inspiration item deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting inspiration item:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
