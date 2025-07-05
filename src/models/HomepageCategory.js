const mongoose = require('mongoose');

const homepageCategorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Titlul este obligatoriu'],
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Imaginea este obligatorie']
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displaySection: {
    type: String,
    enum: ['section1', 'section2', 'section3', 'section4', 'section5', 'section6', 'section7', 'section8', 'section9', 'section10', 'section11', 'section12'],
    default: 'section1'
  },
  style: {
    layout: {
      type: String,
      enum: ['grid', 'carousel', 'featured'],
      default: 'grid'
    },
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    textColor: {
      type: String,
      default: '#000000'
    }
  }
}, {
  timestamps: true
});

// Create slug from title before saving
homepageCategorySchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('HomepageCategory', homepageCategorySchema); 