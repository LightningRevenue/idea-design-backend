const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyUser } = require('../middleware/adminAuth');

// Get cart (user or guest)
router.get('/', cartController.getCart);
// Add to cart
router.post('/add', cartController.addToCart);
// Remove from cart
router.post('/remove', cartController.removeFromCart);
// Clear cart
router.post('/clear', cartController.clearCart);

module.exports = router;
