const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const { search, limit = 10, category, brand } = req.query;
    let query = {};

    // Add search functionality
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Add category filter if provided
    if (category) {
      query.category = category;
    }

    // Add brand filter if provided
    if (brand) {
      query.brand = { $regex: `^${brand}$`, $options: 'i' };
    }

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .limit(Number(limit))
      .select('name description images category brand slug price discount discountType discountValue discountStartDate discountEndDate');
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// ... rest of the controller methods ... 