const express = require('express');
const { registerUser, loginUser, getUserProfile, updateUserProfile, getAllUsers, deleteUser } = require('../controllers/userController');
const { verifyUser, verifyAdmin } = require('../middleware/adminAuth');
const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Authenticated user routes
router.get('/profile', verifyUser, getUserProfile);
router.put('/profile', verifyUser, updateUserProfile);

// Admin routes
router.get('/', verifyAdmin, getAllUsers);
router.delete('/:id', verifyAdmin, deleteUser);

module.exports = router;
