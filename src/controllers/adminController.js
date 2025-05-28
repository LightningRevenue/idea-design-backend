const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Register new admin (for initial setup, can be disabled after first use)
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    // Check if admin already exists
    const existing = await Admin.findOne({ username });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }
    const admin = await Admin.create({ username, password });
    res.status(201).json({ success: true, message: 'Admin created', data: { username: admin.username } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create new admin by an existing admin
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
    }

    // Validate email format (basic regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Check if admin already exists by username or email
    // Note: The Admin model might need an email field if it doesn't have one.
    // Assuming for now it will be added or username is used as email.
    // If Admin model doesn't have an email field, this check might need adjustment.
    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existingAdmin) {
      let message = 'Admin already exists.';
      if (existingAdmin.username === username) {
        message = 'Username already taken.';
      } else if (existingAdmin.email === email) {
        // This part assumes an 'email' field exists in the Admin model
        message = 'Email already registered.';
      }
      return res.status(400).json({ success: false, message });
    }

    // Create new admin (password will be hashed by pre-save hook in Admin model)
    const newAdmin = await Admin.create({ username, email, password });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: { id: newAdmin._id, username: newAdmin.username, email: newAdmin.email }
    });

  } catch (err) {
    // Handle potential errors, e.g., database errors
    if (err.code === 11000) { // Duplicate key error
        // This might be redundant if the check above catches it, but good for other unique constraints
        return res.status(400).json({ success: false, message: 'Username or email already exists.' });
    }
    res.status(500).json({ success: false, message: err.message || 'Server error while creating admin' });
  }
};

// Login admin
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ success: true, token, data: { username: admin.username } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
