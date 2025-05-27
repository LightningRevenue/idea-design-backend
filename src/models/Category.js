const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Numele categoriei este obligatoriu'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Descrierea categoriei este obligatorie'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Imaginea categoriei este obligatorie']
  },
  icon: {
    type: String,
    default: ''
  },
  showInNavbar: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  productCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 