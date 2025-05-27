const jwt = require('jsonwebtoken');

// Middleware to verify admin authentication
const verifyAdmin = function (req, res, next) {
  const authHeader = req.headers.authorization;
  
  console.log('Authorization header:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Check both formats: role === 'admin' or isAdmin === true
    if (decoded.role !== 'admin' && !decoded.isAdmin) {
      console.log('Not authorized - neither role:admin nor isAdmin:true found in token');
      return res.status(403).json({ success: false, message: 'Not authorized as admin' });
    }
    
    // Set both admin and user objects for backward compatibility
    req.admin = decoded;
    
    // Also set user object to ensure controllers can work with either format
    req.user = {
      ...decoded,
      id: decoded.id || decoded._id,
      _id: decoded._id || decoded.id,
      isAdmin: true
    };
    
    console.log('Admin authenticated successfully:', req.user);
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Middleware to verify regular user authentication
const verifyUser = function(req, res, next) {
  const authHeader = req.headers.authorization;
  
  // If no token, proceed as guest
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Make sure we set both id and _id for compatibility
    req.user = {
      ...decoded,
      id: decoded.id || decoded._id,
      _id: decoded._id || decoded.id
    };
    
    console.log('User authenticated via verifyUser:', req.user);
    next();
  } catch (err) {
    console.error('Token verification error in verifyUser:', err);
    // If token is invalid, proceed as guest
    next();
  }
};

module.exports = {
  verifyAdmin,
  verifyUser
};
