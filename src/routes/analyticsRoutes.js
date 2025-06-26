const express = require('express');
const { 
  trackEvent, 
  getDashboardData, 
  getPopupDetails 
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { verifyAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// Rută publică pentru tracking evenimente
router.post('/track', trackEvent);

// Rute protejate pentru admin
router.get('/dashboard', verifyAdmin, getDashboardData);
router.get('/popup-details', verifyAdmin, getPopupDetails);

module.exports = router; 