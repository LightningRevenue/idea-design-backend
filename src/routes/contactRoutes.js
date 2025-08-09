const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { isAuth, isAdmin } = require('../middleware/auth');

// Public routes
router.post('/', contactController.submitContactForm);

// Admin routes
router.get('/', isAuth, isAdmin, contactController.getAllSubmissions);
router.get('/:id', isAuth, isAdmin, contactController.getSubmissionById);
router.patch(
  '/:id/status',
  isAuth,
  isAdmin,
  contactController.updateSubmissionStatus
);
router.delete('/:id', isAuth, isAdmin, contactController.deleteSubmission);

module.exports = router;
