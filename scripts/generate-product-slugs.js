const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../src/models/Product');

// Load environment variables
dotenv.config();

// Function to create slug from text (same as in Product model)
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

async function generateProductSlugs() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB');
    
    // Find all products without slugs
    const products = await Product.find({ 
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    });
    
    console.log(`📦 Found ${products.length} products without slugs`);
    
    if (products.length === 0) {
      console.log('✅ All products already have slugs!');
      process.exit(0);
    }
    
    let updatedCount = 0;
    
    for (const product of products) {
      try {
        let baseSlug = createSlug(product.name);
        let slug = baseSlug;
        let counter = 1;
        
        // Check if slug already exists and make it unique
        while (await Product.findOne({ slug, _id: { $ne: product._id } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        // Update the product with the new slug
        await Product.findByIdAndUpdate(product._id, { slug });
        
        console.log(`✅ Updated "${product.name}" -> slug: "${slug}"`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error updating product "${product.name}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} products with slugs!`);
    
  } catch (error) {
    console.error('❌ Error generating product slugs:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
generateProductSlugs(); 