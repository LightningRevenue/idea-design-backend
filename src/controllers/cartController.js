const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Helper: get cart by user or guestId
async function getCart({ userId, guestId }) {
  console.log('Getting cart with userId:', userId, 'guestId:', guestId);
  
  const deepPopulate = {
    path: 'items.product',
    populate: {
      path: 'category',
      select: 'name' // Only select the 'name' field from the category
    }
  };
  
  // Always prioritize userId if available
  if (userId) {
    // Make sure userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid userId format:', userId);
      return null;
    }
    
    // Convert userId to ObjectId if it's a string
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    console.log('Looking for cart with user ObjectId:', userObjectId);
    
    const cart = await Cart.findOne({ user: userObjectId }).populate(deepPopulate);
    console.log('Cart found for user:', cart ? 'Yes' : 'No');
    
    // If cart found, return it
    if (cart) {
      // Filter out items with null product
      if (cart.items && Array.isArray(cart.items)) {
        cart.items = cart.items.filter(item => item.product !== null);
      }
      return cart;
    }
    
    // If no cart found for user, create a new empty cart
    console.log('No cart found for user, creating new cart');
    const newCart = new Cart({
      user: userObjectId,
      items: []
    });
    await newCart.save();
    return newCart;
  }
  // Only use guestId if userId is not available
  else if (guestId) {
    console.log('Looking for cart with guestId:', guestId);
    const cart = await Cart.findOne({ guestId }).populate(deepPopulate);
    console.log('Cart found for guest:', cart ? 'Yes' : 'No');
    // Filter out items with null product
    if (cart && cart.items && Array.isArray(cart.items)) {
      cart.items = cart.items.filter(item => item.product !== null);
    }
    return cart;
  }
  
  console.log('No userId or guestId provided');
  return null;
}

exports.getCart = async (req, res) => {
  try {
    // Extract from request
    const userId = req.query.userId || req.user?._id || req.user?.id;
    const guestId = req.query.guestId;
    
    console.log('getCart endpoint called with:');
    console.log('userId from query:', req.query.userId);
    console.log('userId from user object:', req.user?._id || req.user?.id);
    console.log('guestId from query:', guestId);
    
    const cart = await getCart({ userId, guestId });

    // Ensure cart items are filtered before sending the response
    if (cart && cart.items && Array.isArray(cart.items)) {
      cart.items = cart.items.filter(item => item.product !== null);
    }
    
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Error in getCart endpoint:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    // Extract from request
    const userId = req.body.userId || req.user?._id || req.user?.id;
    const guestId = req.body.guestId;
    const { productId, qty } = req.body;
    
    console.log('addToCart endpoint called with:');
    console.log('userId:', userId);
    console.log('guestId:', guestId);
    console.log('productId:', productId);
    console.log('qty:', qty);
    
    if (!productId || !qty) {
      return res.status(400).json({ success: false, message: 'Product and qty required' });
    }
    
    // Ensure we have either userId or guestId
    if (!userId && !guestId) {
      console.log('No userId or guestId provided for adding to cart');
      return res.status(400).json({ success: false, message: 'No cart identifier provided' });
    }
    
    // Get or create cart - our updated getCart function will create a new cart for users if needed
    let cart = await getCart({ userId, guestId });
    
    if (!cart) {
      console.log('Creating new cart for', userId ? `user ${userId}` : `guest ${guestId}`);
      cart = new Cart({
        user: userId || undefined,
        guestId: guestId || undefined,
        items: []
      });
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Add or update item
    const itemIdx = cart.items.findIndex(i => i.product.toString() === productId);
    if (itemIdx > -1) {
      cart.items[itemIdx].qty += qty;
      console.log('Updated existing product in cart, new qty:', cart.items[itemIdx].qty);
    } else {
      cart.items.push({ product: productId, qty });
      console.log('Added new product to cart with qty:', qty);
    }
    
    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.product');
    
    console.log('Cart saved, items count:', cart.items.length);
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Error in addToCart endpoint:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    // Extract from request
    const userId = req.body.userId || req.user?._id || req.user?.id;
    const guestId = req.body.guestId;
    const { productId } = req.body;
    
    console.log('removeFromCart endpoint called with:');
    console.log('userId:', userId);
    console.log('guestId:', guestId);
    console.log('productId:', productId);
    console.log('Type of productId:', typeof productId);
    
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID required' });
    }
    
    // Ensure we have either userId or guestId
    if (!userId && !guestId) {
      console.log('No userId or guestId provided for cart removal');
      return res.status(400).json({ success: false, message: 'No cart identifier provided' });
    }
    
    // Get the cart - if userId is provided, it will be used first
    let cart = await getCart({ userId, guestId });
    
    if (!cart) {
      console.log('Cart not found for removal operation');
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    
    // Check if cart items exist
    if (!cart.items || !Array.isArray(cart.items)) {
      console.log('Cart items array is missing or not an array');
      return res.status(400).json({ success: false, message: 'Cart items array is invalid' });
    }
    
    // Remove item
    const initialItemsCount = cart.items.length;

    // Log items in cart before filtering
    console.log('Items in cart before filtering:');
    if (cart.items && cart.items.length > 0) {
      cart.items.forEach(item => {
        if (item.product && item.product._id) {
          console.log(`  Item Product ID: ${item.product._id.toString()}, Name: ${item.product.name}, Type of ID: ${typeof item.product._id.toString()}`);
        } else {
          console.log('  Item product or product._id is missing:', item);
        }
      });
    } else {
      console.log('  Cart is empty or items array is missing.');
    }

    console.log(`Attempting to remove product with ID: ${productId} from cart`);
    
    // Simple and robust filtering logic
    const originalLength = cart.items.length;
    cart.items = cart.items.filter(item => {
      // Handle both populated and non-populated product references
      const itemId = item.product._id ? item.product._id.toString() : item.product.toString();
      const matches = itemId !== productId;
      
      if (!matches) {
        console.log(`Found matching product to remove: ${itemId}`);
      }
      
      return matches;
    });
    
    console.log(`Removed product from cart. Items before: ${initialItemsCount}, after: ${cart.items.length}`);
    
    // Verify removal was successful
    if (originalLength === cart.items.length) {
      console.warn(`Warning: No items were removed from cart. Product ID ${productId} might not exist in cart.`);
    } else {
      console.log(`Successfully removed ${originalLength - cart.items.length} item(s) from cart`);
    }
    
    cart.updatedAt = Date.now();
    cart.markModified('items'); // Ensure Mongoose detects changes to the items array
    
    console.log('Saving cart with updated items:', cart.items.length);
    await cart.save();
    console.log('Cart saved successfully');
    
    await cart.populate('items.product');
    console.log('Cart populated with product details');
    
    console.log('Cart saved, items count:', cart.items.length);
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Error in removeFromCart endpoint:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    // Extract from request
    const userId = req.body.userId || req.user?._id || req.user?.id;
    const guestId = req.body.guestId;
    
    console.log('clearCart endpoint called with:');
    console.log('userId:', userId);
    console.log('guestId:', guestId);
    
    // Ensure we have either userId or guestId
    if (!userId && !guestId) {
      console.log('No userId or guestId provided for clearing cart');
      return res.status(400).json({ success: false, message: 'No cart identifier provided' });
    }
    
    // Get the cart - if userId is provided, it will be used first
    let cart = await getCart({ userId, guestId });
    
    if (!cart) {
      console.log('Cart not found for clear operation');
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    
    // Clear all items
    const initialItemsCount = cart.items.length;
    cart.items = [];
    console.log(`Cleared cart. Removed ${initialItemsCount} items`);
    
    cart.updatedAt = Date.now();
    cart.markModified('items');
    await cart.save();
    
    console.log('Cart cleared successfully');
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Error in clearCart endpoint:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
