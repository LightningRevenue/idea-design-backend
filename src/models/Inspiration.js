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
    maxlength: [500, 'Description can not be more than 500 characters'],
    default: ''
  },
  image: {
    type: String,
    required: [true, 'Please add an image'],
    default: 'uploads/default/no-photo.jpg'
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
  }
});

module.exports = mongoose.model('Inspiration', InspirationSchema);
