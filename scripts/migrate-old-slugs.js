const mongoose = require('mongoose');
require('dotenv').config();

// Import the Product model
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

// Function to create slug from text (copy from Product model)
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

async function migrateOldSlugs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all products
    const products = await Product.find().populate('category', 'name');
    console.log(`Found ${products.length} products to update`);

    // Update each product
    for (const product of products) {
      // Generate the old style slug (just product name)
      const oldStyleSlug = createSlug(product.name);
      
      // Update the product with the old slug if it doesn't have one
      if (!product.oldSlug) {
        product.oldSlug = oldStyleSlug;
        await product.save();
        console.log(`Updated product ${product.name} with old slug: ${oldStyleSlug}`);
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateOldSlugs(); 