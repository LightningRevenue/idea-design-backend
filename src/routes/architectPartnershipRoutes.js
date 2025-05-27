const express = require('express');
const router = express.Router();
const { 
  getAllApplications, 
  getApplicationById, 
  createApplication, 
  updateApplicationStatus, 
  deleteApplication 
} = require('../controllers/architectPartnershipController');
const { verifyAdmin } = require('../middleware/adminAuth');

// Public route - anyone can submit a partnership application
router.post('/', createApplication);

// Admin only routes - protected by authentication middleware
router.get('/', verifyAdmin, getAllApplications);
router.get('/:id', verifyAdmin, getApplicationById);
router.patch('/:id', verifyAdmin, updateApplicationStatus);
router.delete('/:id', verifyAdmin, deleteApplication);

module.exports = router; 