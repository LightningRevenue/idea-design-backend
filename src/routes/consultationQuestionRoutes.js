const express = require('express');
const router = express.Router();
const { isAuth, isAdmin } = require('../middleware/auth');
const consultationQuestionController = require('../controllers/consultationQuestionController');

// Public route - Get all consultation questions
router.get('/', consultationQuestionController.getQuestions);

// Public route - Get a single question by ID
router.get('/:id', consultationQuestionController.getQuestionById);

// Admin routes - protected
router.post('/', isAuth, isAdmin, consultationQuestionController.createQuestion);
router.put('/:id', isAuth, isAdmin, consultationQuestionController.updateQuestion);
router.delete('/:id', isAuth, isAdmin, consultationQuestionController.deleteQuestion);

module.exports = router; 