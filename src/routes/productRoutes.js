const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Import the Product model
const multer = require('multer'); // Import multer
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose'); // Make sure this is at the top with other requires
const { verifyAdmin } = require('../middleware/adminAuth');

// Ensure the upload directory for product images exists
const productImagesDir = path.join(__dirname, '../../uploads/product_images');
if (!fs.existsSync(productImagesDir)){
    fs.mkdirSync(productImagesDir, { recursive: true });
}

// Multer disk storage configuration for product images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, productImagesDir); // Save files to backend/uploads/product_images
    },
    filename: function (req, file, cb) {
        // Create a unique filename: fieldname-timestamp.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer upload instance for multiple images
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            req.fileValidationError = 'Only image files (jpg, jpeg, png, gif, webp) are allowed!';
            return cb(null, false); // Reject file
        }
        cb(null, true); // Accept file
    }
}).array('images', 10); // Accept up to 10 images per product

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Fetch products and populate the 'category' field to get category details
    const products = await Product.find().populate('category', 'name'); // Populate only name field of category
    
    console.log('GET /api/products - Fetched products:', products.length); 

    res.json({
      success: true,
      count: products.length,
      data: products 
    });
  } catch (err) {
    console.error('Error in GET /api/products:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get a single product by ID
// @access  Public
router.get('/:id', async (req, res) => {
    console.log(`GET /api/products/:id route hit with ID: ${req.params.id}`);
    try {
        const productId = req.params.id;
        // Validate if the ID is a valid MongoDB ObjectId before querying
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            console.log(`Invalid ObjectId format for ID: ${productId}`);
            return res.status(400).json({ success: false, message: 'Invalid product ID format' });
        }

        console.log(`Attempting to find product with ID: ${productId}`);
        const product = await Product.findById(productId).populate('category', 'name');

        if (!product) {
            console.log(`Product with ID ${productId} not found in database.`);
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        console.log(`Product found: ${product.name}`);
        res.json({ success: true, data: product });

    } catch (err) {
        console.error(`Error in GET /api/products/${req.params.id}: ${err.message}`, err);
        // More specific error check for CastError (often from invalid ID format during query)
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
             console.error(`CastError: Invalid ObjectId format during findById for ID ${req.params.id}`);
            return res.status(400).json({ success: false, message: 'Invalid product ID format during query' });
        }
        res.status(500).json({ success: false, message: 'Server Error while fetching product' });
    }
});

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (admin only)
router.post('/', verifyAdmin, (req, res) => {
    upload(req, res, async function (err) {
        if (req.fileValidationError) {
            return res.status(400).json({ success: false, message: req.fileValidationError });
        }
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: `Multer error: ${err.message}` });
        }
        if (err) {
            return res.status(500).json({ success: false, message: `Unknown upload error: ${err.message}` });
        }

        try {
            console.log('POST /api/products hit on backend');
            console.log('Request Body:', req.body);
            console.log('Request Files (from multer):', req.files);

            const { name, description, price, stock, category, status, specifications, instructions, shippingAndReturns, keyFeatures, colors } = req.body;

            if (!name || !description || !price || !stock || !category) {
                return res.status(400).json({ success: false, message: 'Please provide all required fields: name, description, price, stock, category' });
            }

            // Handle images array
            let images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map(file => `uploads/product_images/${file.filename}`.replace(/\\/g, '/'));
            } else {
                images = ['uploads/default/no-photo.jpg'];
            }

            let parsedColors = [];
            if (colors) {
                let arr = typeof colors === 'string' ? JSON.parse(colors) : colors;
                parsedColors = arr.map(c => {
                    if (typeof c === 'string') return { value: c, name: '' };
                    if (typeof c === 'object' && c !== null) return { value: c.value || '', name: c.name || '' };
                    return { value: '', name: '' };
                });
            }

            const newProduct = new Product({
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock, 10),
                category,
                status: status || 'draft',
                images,
                specifications: specifications ? JSON.parse(specifications) : {},
                instructions: instructions ? JSON.parse(instructions) : [],
                shippingAndReturns: shippingAndReturns || '',
                keyFeatures: keyFeatures ? JSON.parse(keyFeatures) : [],
                colors: parsedColors
            });

            const savedProduct = await newProduct.save();
            const productWithCategory = await Product.findById(savedProduct._id).populate('category', 'name');

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: productWithCategory 
            });

        } catch (dbErr) {
            console.error('Error in POST /api/products (database operation):', dbErr.message);
            // If files were uploaded but DB save failed, delete all uploaded files
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    fs.unlink(file.path, (unlinkErr) => {
                        if (unlinkErr) console.error("Error deleting orphaned file:", unlinkErr);
                    });
                });
            }
            if (dbErr.name === 'ValidationError') {
                const messages = Object.values(dbErr.errors).map(val => val.message);
                return res.status(400).json({ success: false, message: messages.join(', ') });
            }
            res.status(500).json({ success: false, message: 'Server Error while creating product' });
        }
    });
});

// @route   PUT /api/products/:id
// @desc    Update a product by id
// @access  Private (admin only)
router.put('/:id', verifyAdmin, (req, res) => {
    upload(req, res, async function (err) {
        if (req.fileValidationError) {
            return res.status(400).json({ success: false, message: req.fileValidationError });
        }
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: `Multer error: ${err.message}` });
        }
        if (err) {
            return res.status(500).json({ success: false, message: `Unknown upload error: ${err.message}` });
        }

        console.log('PUT /api/products/:id route hit with ID:', req.params.id);
        console.log('Request Body:', req.body);
        console.log('Request File (from multer):', req.file);

        try {
            const productId = req.params.id;
            
            // Validate if the ID is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({ success: false, message: 'Invalid product ID format' });
            }

            // Find the existing product to check if it exists and to get current image if needed
            const existingProduct = await Product.findById(productId);
            if (!existingProduct) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }

            // Extract fields from the request body
            const { name, description, price, stock, category, status, specifications, instructions, shippingAndReturns, keyFeatures, colors } = req.body;

            // Basic validation of required fields
            if (!name || !description || !price || !stock || !category) {
                return res.status(400).json({ success: false, message: 'Please provide all required fields: name, description, price, stock, category' });
            }

            // Build the update object for the product
            const updateData = {
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock, 10),
                category,
                status: status || 'draft',
                // specifications, instructions, and shippingAndReturns will be handled separately
                // to allow for partial updates and correct parsing if they are sent as JSON strings
            };

            if (specifications !== undefined) {
                try {
                    updateData.specifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON format for specifications.' });
                }
            }

            if (instructions !== undefined) {
                try {
                    updateData.instructions = typeof instructions === 'string' ? JSON.parse(instructions) : instructions;
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON format for instructions.' });
                }
            }

            if (shippingAndReturns !== undefined) {
                updateData.shippingAndReturns = shippingAndReturns;
            }

            if (keyFeatures !== undefined) {
                try {
                    updateData.keyFeatures = typeof keyFeatures === 'string' ? JSON.parse(keyFeatures) : keyFeatures;
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON format for keyFeatures.' });
                }
            }

            if (colors !== undefined) {
                let parsedColors = [];
                let arr = typeof colors === 'string' ? JSON.parse(colors) : colors;
                parsedColors = arr.map(c => {
                    if (typeof c === 'string') return { value: c, name: '' };
                    if (typeof c === 'object' && c !== null) return { value: c.value || '', name: c.name || '' };
                    return { value: '', name: '' };
                });
                updateData.colors = parsedColors;
            }


            // Handle images update
            if (req.files && req.files.length > 0) {
                // Delete all old images except default
                if (Array.isArray(existingProduct.images)) {
                    existingProduct.images.forEach(imgPath => {
                        if (imgPath && !imgPath.includes('no-photo.jpg')) {
                            const oldImagePath = path.join(__dirname, '../../', imgPath);
                            fs.unlink(oldImagePath, (unlinkErr) => {
                                if (unlinkErr && !unlinkErr.code === 'ENOENT') {
                                    console.error("Error deleting old product image:", unlinkErr);
                                }
                            });
                        }
                    });
                }
                // Set new images
                updateData.images = req.files.map(file => `uploads/product_images/${file.filename}`.replace(/\\/g, '/'));
            }
            // If no new images uploaded, keep the existing images (don't set images field in updateData)

            console.log('Updating product with data:', updateData);
            // Update the product in the database
            const updatedProduct = await Product.findByIdAndUpdate(
                productId, 
                updateData,
                { new: true, runValidators: true } // Returns the updated document and runs validators
            ).populate('category', 'name');

            res.json({
                success: true,
                message: 'Product updated successfully',
                data: updatedProduct
            });

        } catch (err) {
            console.error('Error in PUT /api/products/:id:', err.message, err);
            // Check for validation errors
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(val => val.message);
                return res.status(400).json({ success: false, message: messages.join(', ') });
            }
            // Check for CastError (often from invalid ID format)
            if (err.name === 'CastError' && err.kind === 'ObjectId') {
                return res.status(400).json({ success: false, message: 'Invalid product ID format during update' });
            }
            res.status(500).json({ success: false, message: 'Server Error while updating product' });
        }
    });
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    console.log(`DELETE /api/products/:id route hit with ID: ${req.params.id}`);
    try {
        const productId = req.params.id;
        
        // Validate if the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID format' });
        }

        // Find the product first to check if it exists and to get the image path
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Delete the product from the database
        const result = await Product.findByIdAndDelete(productId);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Delete the product's image file if it exists and is not the default
        if (product.image && !product.image.includes('no-photo.jpg')) {
            const imagePath = path.join(__dirname, '../../', product.image);
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr && !unlinkErr.code === 'ENOENT') { // ENOENT = file doesn't exist, which is fine
                    console.error("Error deleting product image during product deletion:", unlinkErr);
                }
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (err) {
        console.error('Error in DELETE /api/products/:id:', err.message, err);
        // Check for CastError (often from invalid ID format)
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'Invalid product ID format' });
        }
        res.status(500).json({ success: false, message: 'Server Error while deleting product' });
    }
});

module.exports = router;