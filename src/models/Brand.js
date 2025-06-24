const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String, // Path to logo image
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pentru căutare rapidă
brandSchema.index({ name: 1 });
brandSchema.index({ isActive: 1 });

module.exports = mongoose.model('Brand', brandSchema); 