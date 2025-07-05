const mongoose = require('mongoose');

const InspirationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title can not be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description can not be more than 2000 characters']
  },
  mainImage: {
    type: String,
    required: [true, 'Please add a main image']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      default: ''
    }
  }],
  projectDetails: {
    location: {
      type: String,
      default: ''
    },
    area: {
      type: Number,
      default: 0
    },
    completionYear: {
      type: Number,
      default: null
    },
    style: {
      type: String,
      default: ''
    }
  },
  tags: {
    type: [String], // Array of strings for tags like ['modern', 'baie', 'minimalist']
    default: []
  },
  category: {
    type: String,
    enum: ['living', 'dormitor', 'bucatarie', 'baie', 'exterior', 'birou', 'alte'],
    default: 'alte'
  },
  status: {
    type: String,
    enum: ['active', 'draft', 'archived'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false // Pentru a marca pozele featured care apar pe homepage
  },
  viewCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  slug: {
    type: String,
    unique: true
  }
});

// Create slug from title before saving
InspirationSchema.pre('save', function(next) {
  if (!this.isModified('title')) {
    next();
    return;
  }
  
  this.slug = this.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  next();
});

module.exports = mongoose.model('Inspiration', InspirationSchema);
