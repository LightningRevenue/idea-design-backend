const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Product name can not be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description can not be more than 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // This refers to the 'Category' model
    required: [true, 'Please add a category']
  },
  images: {
    type: [String], // Array of image paths, e.g., ['/uploads/product_images/img1.jpg', ...]
    default: ['uploads/default/no-photo.jpg'] // Default image if none uploaded
  },
  status: {
    type: String,
    enum: ['active', 'draft', 'archived'],
    default: 'draft'
  },
  specifications: {
    type: Map,
    of: String // Allows for key-value pairs, e.g., { "Culoare": "Alb", "Material": "Bumbac" }
  },
  instructions: {
    type: [String] // Array of strings for usage instructions
  },
  shippingAndReturns: {
    type: String // A single string for shipping and return information
  },
  keyFeatures: {
    type: [String] // Array of strings for key product features
  },  colors: {
    type: [
      {
        value: { type: String, required: true },
        name: { type: String, default: '' }
      }
    ],
    default: []
  },  youtubeUrl: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty string
        // Validate YouTube URL format
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
        return youtubeRegex.test(v);
      },
      message: 'Please provide a valid YouTube URL'
    }
  },
  technicalDatasheetUrl: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty string
        // Validate URL format for PDFs
        const urlRegex = /^(https?:\/\/)[\w\-\.]+\.[a-zA-Z]{2,}(\/.*)?$/;
        return urlRegex.test(v);
      },
      message: 'Please provide a valid URL for the technical datasheet'
    }
  },
  isRecommended: { // Added field for recommended products
    type: Boolean,
    default: false
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Function to create slug from text (similar to frontend)
function createSlug(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/[îí]/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens
}

// Middleware to create a slug from the name before saving
ProductSchema.pre('save', async function(next) {
  if (this.isModified('name') || this.isNew) {
    let baseSlug = createSlug(this.name);
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug already exists and make it unique
    while (await mongoose.model('Product').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

module.exports = mongoose.model('Product', ProductSchema);