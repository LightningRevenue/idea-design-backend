const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Product name can not be more than 100 characters']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand name can not be more than 50 characters'],
    default: null,
    set: v => v === '' ? null : v // Convert empty strings to null
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
  // Sistem de reduceri
  discountType: {
    type: String,
    enum: ['none', 'percentage', 'fixed'],
    default: 'none'
  },
  discountValue: {
    type: Number,
    default: 0,
    min: [0, 'Discount value cannot be negative']
  },
  discountStartDate: {
    type: Date,
    default: null
  },
  discountEndDate: {
    type: Date,
    default: null
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

// Virtual pentru prețul cu reducere
ProductSchema.virtual('discountedPrice').get(function() {
  if (this.discountType === 'none' || this.discountValue <= 0) {
    return null;
  }
  
  // Verifică dacă reducerea este activă (în perioada specificată)
  const now = new Date();
  if (this.discountStartDate && now < this.discountStartDate) {
    return null; // Reducerea nu a început încă
  }
  if (this.discountEndDate && now > this.discountEndDate) {
    return null; // Reducerea s-a terminat
  }
  
  if (this.discountType === 'percentage') {
    const discount = (this.price * this.discountValue) / 100;
    const finalPrice = this.price - discount;
    return finalPrice < this.price ? Math.max(0, finalPrice) : null;
  } else if (this.discountType === 'fixed') {
    const finalPrice = this.price - this.discountValue;
    return finalPrice < this.price ? Math.max(0, finalPrice) : null;
  }
  
  return null;
});

// Virtual pentru a verifica dacă produsul are reducere activă
ProductSchema.virtual('hasActiveDiscount').get(function() {
  if (this.discountType === 'none' || this.discountValue === 0) {
    return false;
  }
  
  const now = new Date();
  if (this.discountStartDate && now < this.discountStartDate) {
    return false;
  }
  if (this.discountEndDate && now > this.discountEndDate) {
    return false;
  }
  
  return true;
});

// Virtual pentru procentul de reducere (pentru afișare)
ProductSchema.virtual('discountPercentageDisplay').get(function() {
  if (!this.hasActiveDiscount) return 0;
  
  if (this.discountType === 'percentage') {
    return this.discountValue;
  } else if (this.discountType === 'fixed') {
    return Math.round((this.discountValue / this.price) * 100);
  }
  
  return 0;
});

// Asigură-te că virtualurile sunt incluse în JSON
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

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
    // Populate the category if it's not already populated
    if (this.category && typeof this.category === 'object' && !this.category.name) {
      await this.populate('category', 'name');
    }
    
    let baseSlug;
    if (this.category && this.category.name) {
      baseSlug = createSlug(`${this.category.name} ${this.name}`);
    } else {
      baseSlug = createSlug(this.name);
    }
    
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