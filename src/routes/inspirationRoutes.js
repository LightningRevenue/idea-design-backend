const express = require('express');
const router = express.Router();
const Inspiration = require('../models/Inspiration');
const path = require('path');
const fs = require('fs');
const { verifyAdmin } = require('../middleware/adminAuth');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const { uploadAndProcessInspirationImage } = require('../middleware/s3Upload');

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

// @route   GET /api/inspiration/:idOrSlug
// @desc    Get single inspiration item by ID or slug
// @access  Public
router.get('/:idOrSlug', async (req, res) => {
  try {
    let inspirationItem;
    
    // First try to find by ID (for admin panel)
    if (mongoose.Types.ObjectId.isValid(req.params.idOrSlug)) {
      inspirationItem = await Inspiration.findById(req.params.idOrSlug);
    }
    
    // If not found by ID, try to find by slug (for frontend)
    if (!inspirationItem) {
      inspirationItem = await Inspiration.findOne({ slug: req.params.idOrSlug });
    }
    
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
    console.error('Error in GET /api/inspiration/:idOrSlug:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/inspiration
// @desc    Create new inspiration item
// @access  Private (admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      tags, 
      category, 
      status, 
      featured,
      mainImage,
      images,
      projectDetails 
    } = req.body;
    
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
      mainImage,
      images: images || [],
      projectDetails: {
        location: projectDetails?.location || '',
        area: Number(projectDetails?.area) || 0,
        completionYear: Number(projectDetails?.completionYear) || null,
        style: projectDetails?.style || ''
      },
      tags: parsedTags,
      category: category || 'alte',
      status: status || 'draft',
      featured: featured === 'true' || featured === true
    };
    
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

// @route   PUT /api/inspiration/:id
// @desc    Update inspiration item
// @access  Private (admin only)
router.put('/:id', verifyAdmin, uploadAndProcessInspirationImage, async (req, res) => {
  try {
    const inspirationItem = await Inspiration.findById(req.params.id);
    
    if (!inspirationItem) {
      return res.status(404).json({ success: false, message: 'Inspiration item not found' });
    }
    
    const { title, description, tags, category, status, featured, projectDetails, mainImage, images } = req.body;
    
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
      featured: featured !== undefined ? (featured === 'true' || featured === true) : inspirationItem.featured,
      projectDetails: {
        location: projectDetails?.location || inspirationItem.projectDetails?.location || '',
        area: projectDetails?.area !== undefined ? Number(projectDetails.area) : inspirationItem.projectDetails?.area || 0,
        completionYear: projectDetails?.completionYear !== undefined ? Number(projectDetails.completionYear) : inspirationItem.projectDetails?.completionYear || null,
        style: projectDetails?.style || inspirationItem.projectDetails?.style || ''
      }
    };

    // Update mainImage if provided
    if (mainImage) {
      updateData.mainImage = mainImage;
    }

    // Update images array if provided
    if (images) {
      updateData.images = images;
    }
    
    // Handle image upload from S3
    if (req.uploadedUrl) {
      updateData.mainImage = req.uploadedUrl;
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

// @route   POST /api/inspiration/upload
// @desc    Upload inspiration image(s)
// @access  Private (admin only)
router.post('/upload', verifyAdmin, uploadAndProcessInspirationImage, async (req, res) => {
  try {
    if (!req.uploadedUrl) {
      return res.status(400).json({
        success: false,
        message: 'No image was uploaded'
      });
    }

    res.json({
      success: true,
      url: req.uploadedUrl,
      message: 'Image uploaded successfully'
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({
      success: false,
      message: 'Error uploading image'
    });
  }
});

module.exports = router;
