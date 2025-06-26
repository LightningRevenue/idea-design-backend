const express = require('express');
const router = express.Router();
const {
  getOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  updateOfferStatus,
  generateOfferPDF
} = require('../controllers/offerController');

const { verifyAdmin } = require('../middleware/adminAuth');

// Toate rutele necesită autentificare admin
router.use(verifyAdmin);

// @route   GET /api/offers
// @desc    Get all offers with pagination and filtering
// @access  Privates
router.get('/', getOffers);

// @route   GET /api/offers/:id
// @desc    Get single offer by ID
// @access  Private
router.get('/:id', getOffer);

// @route   POST /api/offers
// @desc    Create new offer
// @access  Private
router.post('/', createOffer);

// @route   PUT /api/offers/:id
// @desc    Update offer
// @access  Private
router.put('/:id', updateOffer);

// @route   DELETE /api/offers/:id
// @desc    Delete offer
// @access  Private
router.delete('/:id', deleteOffer);

// @route   PUT /api/offers/:id/status
// @desc    Update offer status
// @access  Private
router.put('/:id/status', updateOfferStatus);

// @route   GET /api/offers/:id/pdf
// @desc    Generate and download PDF for offer
// @access  Private
router.get('/:id/pdf', generateOfferPDF);

module.exports = router; 