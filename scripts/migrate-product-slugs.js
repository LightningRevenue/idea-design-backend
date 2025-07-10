const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

// Function to create slug (copy from Product model)
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

async function migrateProductSlugs(dryRun = true) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all products with their categories
    const products = await Product.find().populate('category');
    console.log(`Found ${products.length} products to process`);
    console.log(dryRun ? 'DRY RUN - No changes will be made' : 'LIVE RUN - Changes will be saved');
    console.log('----------------------------------------');

    // Update each product
    for (const product of products) {
      try {
        // Generate oldSlug from JUST the product name
        const oldSlug = createSlug(product.name);
        
        // Keep existing slug if it exists, otherwise generate new one
        const categoryName = product.category ? product.category.name : '';
        const newSlug = product.slug || createSlug(`${categoryName} ${product.name}`);

        console.log(`\nProduct: "${product.name}"`);
        console.log(`Category: ${categoryName}`);
        console.log(`Current slug: ${product.slug}`);
        console.log(`Current oldSlug: ${product.oldSlug}`);
        console.log(`Will set oldSlug to: ${oldSlug}`);
        console.log(`Will keep slug as: ${newSlug}`);
        console.log(`Old URL format will be: /${createSlug(categoryName)}/${oldSlug}`);
        console.log(`New URL format will be: /${createSlug(categoryName)}/${newSlug}`);
        
        if (!dryRun) {
          // Only update if needed
          if (product.oldSlug !== oldSlug || product.slug !== newSlug) {
            product.oldSlug = oldSlug;
            product.slug = newSlug;
            await product.save();
            console.log('✅ Changes saved');
          } else {
            console.log('⏭️ No changes needed');
          }
        }

      } catch (error) {
        console.error(`❌ Error processing product ${product.name}:`, error);
      }
      console.log('----------------------------------------');
    }

    console.log('\nProcess completed');
    if (dryRun) {
      console.log('\nThis was a dry run. To make actual changes, run:');
      console.log('node scripts/migrate-product-slugs.js --live');
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Check if --live flag is passed
const isLive = process.argv.includes('--live');

// Run the migration
migrateProductSlugs(!isLive); 