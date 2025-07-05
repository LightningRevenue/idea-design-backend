const express = require('express');
const router = express.Router();
const HomepageCategory = require('../models/HomepageCategory');
const Product = require('../models/Product');
const { verifyAdmin } = require('../middleware/adminAuth');
const { uploadAndProcessCategoryImage } = require('../middleware/s3Upload');

// Get all homepage categories
router.get('/', async (req, res) => {
  try {
    const categories = await HomepageCategory.find()
      .populate('products')
      .sort('displayOrder');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get available products for admin
router.get('/admin/available-products', verifyAdmin, async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' })
      .select('_id name price discountType discountValue discountStartDate discountEndDate')
      .lean()
      .exec();

    console.log('Found active products:', products.length);

    // Calculate discounted price for each product
    const productsWithDiscount = products.map(product => {
      const now = new Date();
      let discountedPrice = null;

      if (product.discountType !== 'none' && product.discountValue > 0) {
        // Check if discount is active
        const isDiscountActive = (!product.discountStartDate || now >= product.discountStartDate) &&
                               (!product.discountEndDate || now <= product.discountEndDate);

        if (isDiscountActive) {
          if (product.discountType === 'percentage') {
            const discount = (product.price * product.discountValue) / 100;
            discountedPrice = Math.max(0, product.price - discount);
          } else if (product.discountType === 'fixed') {
            discountedPrice = Math.max(0, product.price - product.discountValue);
          }
        }
      }

      return {
        _id: product._id,
        name: product.name,
        price: product.price,
        discountedPrice: discountedPrice
      };
    });
    
    console.log('Processed products with discounts:', productsWithDiscount.length);
    res.json({ 
      success: true, 
      data: productsWithDiscount
    });
  } catch (error) {
    console.error('Error in available-products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching available products',
      error: error.message 
    });
  }
});

// Get a single homepage category by slug
router.get('/slug/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        console.log('Fetching category with slug:', slug);
        
        // Create a regex pattern that matches the slug ignoring case
        const slugRegex = new RegExp(`^${slug}$`, 'i');
        
        // Find the category where the slug of the title matches
        const category = await HomepageCategory.findOne({
            $expr: {
                $regexMatch: {
                    input: { $toLower: { $trim: { input: { $replaceAll: { input: "$title", find: " ", replacement: "-" } } } } },
                    regex: slugRegex
                }
            }
        }).populate({
            path: 'products',
            select: '_id name price images category slug description discountType discountValue discountStartDate discountEndDate',
            populate: {
                path: 'category',
                select: 'name slug'
            }
        });

        // Log the populated category data to the console for debugging
        console.log('Populated category data from backend:', JSON.stringify(category, null, 2));

        if (!category) {
            console.log('Category not found for slug:', slug);
            return res.status(404).json({ 
                success: false, 
                message: 'Secțiunea nu a fost găsită' 
            });
        }

        // Calculate discounted prices for products
        const categoryData = category.toObject();
        categoryData.products = categoryData.products.map(product => {
            const now = new Date();
            let discountedPrice = null;

            if (product.discountType !== 'none' && product.discountValue > 0) {
                const isDiscountActive = (!product.discountStartDate || now >= product.discountStartDate) &&
                                    (!product.discountEndDate || now <= product.discountEndDate);

                if (isDiscountActive) {
                    if (product.discountType === 'percentage') {
                        const discount = (product.price * product.discountValue) / 100;
                        discountedPrice = Math.max(0, product.price - discount);
                    } else if (product.discountType === 'fixed') {
                        discountedPrice = Math.max(0, product.price - product.discountValue);
                    }
                }
            }

            return {
                ...product,
                discountedPrice
            };
        });

        res.json({ success: true, data: categoryData });
    } catch (error) {
        console.error('Error fetching category by slug:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Eroare la încărcarea secțiunii' 
        });
    }
});

// Get a single homepage category
router.get('/:id', async (req, res) => {
  try {
    console.log('Fetching category with ID:', req.params.id);
    const category = await HomepageCategory.findById(req.params.id)
      .populate({
        path: 'products',
        select: '_id name price discountType discountValue discountStartDate discountEndDate'
      });
    
    if (!category) {
      console.log('Category not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    console.log('Found category:', category._id, 'with products:', category.products.length);

    // Calculate discounted prices for products
    const categoryData = category.toObject();
    categoryData.products = categoryData.products.map(product => {
      const now = new Date();
      let discountedPrice = null;

      if (product.discountType !== 'none' && product.discountValue > 0) {
        // Check if discount is active
        const isDiscountActive = (!product.discountStartDate || now >= product.discountStartDate) &&
                               (!product.discountEndDate || now <= product.discountEndDate);

        if (isDiscountActive) {
          if (product.discountType === 'percentage') {
            const discount = (product.price * product.discountValue) / 100;
            discountedPrice = Math.max(0, product.price - discount);
          } else if (product.discountType === 'fixed') {
            discountedPrice = Math.max(0, product.price - product.discountValue);
          }
        }
      }

      return {
        _id: product._id,
        name: product.name,
        price: product.price,
        discountedPrice: discountedPrice
      };
    });

    res.json({ success: true, data: categoryData });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new homepage category (admin only)
router.post('/', verifyAdmin, uploadAndProcessCategoryImage, async (req, res) => {
  try {
    console.log('Creating new category with body:', req.body);
    
    // Get products array from body
    const products = req.body.products || [];
    console.log('Products from body:', products);
    
    const productIds = Array.isArray(products) ? products : [products];
    console.log('Processed product IDs:', productIds);

    const categoryData = {
      title: req.body.title,
      description: req.body.description,
      image: req.uploadedUrl || req.body.image,
      displayOrder: parseInt(req.body.displayOrder) || 0,
      isActive: req.body.isActive === 'true',
      displaySection: req.body.displaySection || 'section1',
      style: {
        layout: req.body.style?.layout || 'grid',
        backgroundColor: req.body.style?.backgroundColor || '#ffffff',
        textColor: req.body.style?.textColor || '#000000'
      },
      products: productIds
    };

    console.log('Category data to save:', categoryData);

    const category = new HomepageCategory(categoryData);
    console.log('Created category instance:', category);
    
    const savedCategory = await category.save();
    console.log('Saved category:', savedCategory);
    
    // Populate products for response
    const populatedCategory = await HomepageCategory.findById(savedCategory._id)
      .populate('products');
    
    console.log('Populated category products:', populatedCategory.products.length);
    
    res.status(201).json({ success: true, data: populatedCategory });
  } catch (error) {
    console.error('Error creating category:', error);
    console.error('Stack trace:', error.stack);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update a homepage category (admin only)
router.put('/:id', verifyAdmin, uploadAndProcessCategoryImage, async (req, res) => {
  try {
    console.log('Updating category ID:', req.params.id);
    console.log('Update body:', req.body);

    const products = req.body.products || [];
    const productIds = Array.isArray(products) ? products : [products];

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      displayOrder: parseInt(req.body.displayOrder) || 0,
      isActive: req.body.isActive === 'true',
      displaySection: req.body.displaySection || 'section1',
      style: {
        layout: req.body.style?.layout || 'grid',
        backgroundColor: req.body.style?.backgroundColor || '#ffffff',
        textColor: req.body.style?.textColor || '#000000'
      },
      products: productIds
    };

    // Only update image if a new one was uploaded or provided
    if (req.uploadedUrl || req.body.image) {
      updateData.image = req.uploadedUrl || req.body.image;
    }

    console.log('Update data:', updateData);

    const updatedCategory = await HomepageCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('products');

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    console.log('Updated category:', updatedCategory);
    res.json({ success: true, data: updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete a homepage category (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const category = await HomepageCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update display order of multiple categories (admin only)
router.post('/update-order', verifyAdmin, async (req, res) => {
  try {
    const { categories } = req.body;
    
    // Update each category's display order
    const updatePromises = categories.map(({ id, displayOrder }) => 
      HomepageCategory.findByIdAndUpdate(id, { displayOrder })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ success: true, message: 'Display order updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 