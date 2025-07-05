const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Numele brandului este obligatoriu'],
    unique: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    required: [true, 'Descrierea brandului este obligatorie'],
    maxlength: 200,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String,
    required: [true, 'Logo-ul brandului este obligatoriu'],
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index pentru căutare rapidă
brandSchema.index({ name: 1 });
brandSchema.index({ isActive: 1 });

// Crearea slug-ului înainte de salvare
brandSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Brand', brandSchema); 