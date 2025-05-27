const express = require('express');
const router = express.Router();
const { isAuth, isAdmin } = require('../middleware/auth');
const consultationController = require('../controllers/consultationController');

// Public route for submitting a consultation request
router.post('/submit', consultationController.submitConsultation);

// User route - requires authentication but not admin
router.get('/user', isAuth, consultationController.getUserConsultations);

// Admin routes - protected
router.get('/', isAuth, isAdmin, consultationController.getConsultations);
router.get('/:id', isAuth, isAdmin, consultationController.getConsultationById);
router.put('/:id/status', isAuth, isAdmin, consultationController.updateConsultationStatus);
router.delete('/:id', isAuth, isAdmin, consultationController.deleteConsultation);

module.exports = router; 