const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyUser, verifyAdmin } = require('../middleware/adminAuth');

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'API server is running'
  });
});

// Rute pentru comenzi (accesibile pentru utilizatori autentificați și guest)
router.post('/', verifyUser, orderController.createOrder);
router.get('/myorders', verifyUser, orderController.getMyOrders);
router.get('/:id', verifyUser, orderController.getOrderById);

// Rută publică pentru pagina de confirmare comandă
router.get('/:id/confirmation', orderController.getOrderByIdFromConfirmation);

// Rute pentru admin
router.get('/', verifyAdmin, orderController.getAllOrders);
router.put('/:id/status', verifyAdmin, orderController.updateOrderStatus);

// Actualizare status plată
router.put('/:id/pay', verifyUser, orderController.updateOrderToPaid);

module.exports = router; 