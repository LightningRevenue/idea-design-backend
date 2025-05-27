const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

// Middleware to check if the user is authenticated
exports.isAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // First check if it's an admin
    const admin = await Admin.findById(decoded.id);
    
    if (admin) {
      // It's an admin user
      req.admin = admin;
      req.user = admin; // For compatibility with other middleware
      next();
      return;
    }
    
    // If not an admin, check if it's a regular user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication token is invalid, access denied' });
    }
    
    // Add user info to request
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ success: false, message: 'Invalid token, authentication failed' });
  }
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  // If isAuth middleware has already run, req.admin will be set
  if (req.admin) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied, admin privileges required' });
  }
}; 