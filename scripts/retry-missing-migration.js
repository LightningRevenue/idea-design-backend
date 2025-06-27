const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models și S3 config
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Inspiration = require('../src/models/Inspiration');
const Brand = require('../src/models/Brand');
const { uploadToS3 } = require('../src/config/s3Config');

// Conectare la MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ideadesign');

// Statistici
let stats = {
  totalProcessed: 0,
  successfulUploads: 0,
  failedUploads: 0,
  skippedAlreadyMigrated: 0,
  skippedMissingFiles: 0,
  errors: []
};

// Funcție pentru verificarea existenței unui fișier local
const checkLocalFileExists = (imagePath) => {
  if (!imagePath) return false;
  const localPath = path.join(__dirname, '..', imagePath.replace(/^\//, ''));
  return fs.existsSync(localPath);
};

// Funcție pentru încărcarea unui fișier în S3
const uploadImageToS3 = async (localPath, s3Folder) => {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const fileName = path.basename(localPath);
    const contentType = getContentType(fileName);
    
    const result = await uploadToS3(fileBuffer, fileName, contentType, s3Folder);
    return result;
  } catch (error) {
    console.error(`Eroare la citirea fișierului ${localPath}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Funcție pentru determinarea tipului de conținut
const getContentType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp'
  };
  return contentTypes[ext] || 'image/jpeg';
};

// Funcție pentru migrarea imaginilor produselor
const retryProductImages = async () => {
  console.log('\n🔄 Re-migrare imagini produse...');
  
  const products = await Product.find({});
  let processedProducts = 0;

  for (const product of products) {
    if (!product.images || product.images.length === 0) continue;

    let hasUpdates = false;
    const updatedImages = [];

    for (const imagePath of product.images) {
      if (!imagePath || imagePath.includes('no-photo.jpg') || imagePath.includes('default')) {
        updatedImages.push(imagePath);
        continue;
      }

      stats.totalProcessed++;

      // Dacă imaginea este deja în S3, o păstrăm
      if (imagePath.startsWith('https://')) {
        updatedImages.push(imagePath);
        stats.skippedAlreadyMigrated++;
        console.log(`⏭️  Deja în S3: ${path.basename(imagePath)} (${product.name})`);
        continue;
      }

      // Verifică dacă fișierul există local
      const localPath = path.join(__dirname, '..', imagePath.replace(/^\//, ''));
      if (!checkLocalFileExists(imagePath)) {
        console.log(`❌ Fișier lipsă: ${imagePath} (${product.name})`);
        stats.skippedMissingFiles++;
        stats.errors.push({
          type: 'product',
          product: product.name,
          imagePath: imagePath,
          error: 'Fișierul local nu există'
        });
        // Nu adăugăm imaginea lipsă în array
        continue;
      }

      // Încearcă să încarce în S3
      console.log(`🚀 Migrare: ${imagePath} (${product.name})`);
      const uploadResult = await uploadImageToS3(localPath, 'product-images');

      if (uploadResult.success) {
        updatedImages.push(uploadResult.url);
        stats.successfulUploads++;
        hasUpdates = true;
        console.log(`✅ Succes: ${uploadResult.url}`);
      } else {
        updatedImages.push(imagePath); // Păstrează calea originală
        stats.failedUploads++;
        stats.errors.push({
          type: 'product',
          product: product.name,
          imagePath: imagePath,
          error: uploadResult.error
        });
        console.log(`❌ Eșec: ${uploadResult.error}`);
      }
    }

    // Actualizează produsul dacă sunt schimbări
    if (hasUpdates) {
      await Product.findByIdAndUpdate(product._id, { images: updatedImages });
      processedProducts++;
      console.log(`📝 Actualizat produs: ${product.name}`);
    }
  }

  console.log(`\n📦 Produse procesate: ${processedProducts}`);
};

// Funcție pentru migrarea imaginilor categoriilor
const retryCategoryImages = async () => {
  console.log('\n🔄 Re-migrare imagini categorii...');
  
  const categories = await Category.find({});
  let processedCategories = 0;

  for (const category of categories) {
    if (!category.image) continue;

    stats.totalProcessed++;

    // Dacă imaginea este deja în S3, o sărim
    if (category.image.startsWith('https://')) {
      stats.skippedAlreadyMigrated++;
      console.log(`⏭️  Deja în S3: ${path.basename(category.image)} (${category.name})`);
      continue;
    }

    // Verifică dacă fișierul există local
    const localPath = path.join(__dirname, '..', category.image.replace(/^\//, ''));
    if (!checkLocalFileExists(category.image)) {
      console.log(`❌ Fișier lipsă: ${category.image} (${category.name})`);
      stats.skippedMissingFiles++;
      stats.errors.push({
        type: 'category',
        category: category.name,
        imagePath: category.image,
        error: 'Fișierul local nu există'
      });
      continue;
    }

    // Încearcă să încarce în S3
    console.log(`🚀 Migrare: ${category.image} (${category.name})`);
    const uploadResult = await uploadImageToS3(localPath, 'category-images');

    if (uploadResult.success) {
      await Category.findByIdAndUpdate(category._id, { image: uploadResult.url });
      stats.successfulUploads++;
      processedCategories++;
      console.log(`✅ Succes: ${uploadResult.url}`);
      console.log(`📝 Actualizată categoria: ${category.name}`);
    } else {
      stats.failedUploads++;
      stats.errors.push({
        type: 'category',
        category: category.name,
        imagePath: category.image,
        error: uploadResult.error
      });
      console.log(`❌ Eșec: ${uploadResult.error}`);
    }
  }

  console.log(`\n📁 Categorii procesate: ${processedCategories}`);
};

// Funcție pentru migrarea imaginilor de inspirație
const retryInspirationImages = async () => {
  console.log('\n🔄 Re-migrare imagini inspirație...');
  
  const inspirations = await Inspiration.find({});
  let processedInspirations = 0;

  for (const inspiration of inspirations) {
    if (!inspiration.image) continue;

    stats.totalProcessed++;

    // Dacă imaginea este deja în S3, o sărim
    if (inspiration.image.startsWith('https://')) {
      stats.skippedAlreadyMigrated++;
      console.log(`⏭️  Deja în S3: ${path.basename(inspiration.image)} (${inspiration.title})`);
      continue;
    }

    // Verifică dacă fișierul există local
    const localPath = path.join(__dirname, '..', inspiration.image.replace(/^\//, ''));
    if (!checkLocalFileExists(inspiration.image)) {
      console.log(`❌ Fișier lipsă: ${inspiration.image} (${inspiration.title})`);
      stats.skippedMissingFiles++;
      stats.errors.push({
        type: 'inspiration',
        inspiration: inspiration.title,
        imagePath: inspiration.image,
        error: 'Fișierul local nu există'
      });
      continue;
    }

    // Încearcă să încarce în S3
    console.log(`🚀 Migrare: ${inspiration.image} (${inspiration.title})`);
    const uploadResult = await uploadImageToS3(localPath, 'inspiration-images');

    if (uploadResult.success) {
      await Inspiration.findByIdAndUpdate(inspiration._id, { image: uploadResult.url });
      stats.successfulUploads++;
      processedInspirations++;
      console.log(`✅ Succes: ${uploadResult.url}`);
      console.log(`📝 Actualizată inspirația: ${inspiration.title}`);
    } else {
      stats.failedUploads++;
      stats.errors.push({
        type: 'inspiration',
        inspiration: inspiration.title,
        imagePath: inspiration.image,
        error: uploadResult.error
      });
      console.log(`❌ Eșec: ${uploadResult.error}`);
    }
  }

  console.log(`\n💡 Inspirații procesate: ${processedInspirations}`);
};

// Funcție pentru migrarea logo-urilor brandurilor
const retryBrandLogos = async () => {
  console.log('\n🔄 Re-migrare logo-uri branduri...');
  
  const brands = await Brand.find({});
  let processedBrands = 0;

  for (const brand of brands) {
    if (!brand.logo) continue;

    stats.totalProcessed++;

    // Dacă logo-ul este deja în S3, îl sărim
    if (brand.logo.startsWith('https://')) {
      stats.skippedAlreadyMigrated++;
      console.log(`⏭️  Deja în S3: ${path.basename(brand.logo)} (${brand.name})`);
      continue;
    }

    // Verifică dacă fișierul există local
    const localPath = path.join(__dirname, '..', brand.logo.replace(/^\//, ''));
    if (!checkLocalFileExists(brand.logo)) {
      console.log(`❌ Fișier lipsă: ${brand.logo} (${brand.name})`);
      stats.skippedMissingFiles++;
      stats.errors.push({
        type: 'brand',
        brand: brand.name,
        imagePath: brand.logo,
        error: 'Fișierul local nu există'
      });
      continue;
    }

    // Încearcă să încarce în S3
    console.log(`🚀 Migrare: ${brand.logo} (${brand.name})`);
    const uploadResult = await uploadImageToS3(localPath, 'brand-logos');

    if (uploadResult.success) {
      await Brand.findByIdAndUpdate(brand._id, { logo: uploadResult.url });
      stats.successfulUploads++;
      processedBrands++;
      console.log(`✅ Succes: ${uploadResult.url}`);
      console.log(`📝 Actualizat brandul: ${brand.name}`);
    } else {
      stats.failedUploads++;
      stats.errors.push({
        type: 'brand',
        brand: brand.name,
        imagePath: brand.logo,
        error: uploadResult.error
      });
      console.log(`❌ Eșec: ${uploadResult.error}`);
    }
  }

  console.log(`\n🏷️  Branduri procesate: ${processedBrands}`);
};

// Funcția principală
const retryMigration = async () => {
  console.log('🔄 Re-migrare imagini lipsă către S3...\n');
  
  try {
    await retryProductImages();
    await retryCategoryImages();
    await retryInspirationImages();
    await retryBrandLogos();

    // Afișează raportul final
    console.log('\n📊 RAPORT RE-MIGRARE');
    console.log('=====================================');
    console.log(`📋 Total procesate: ${stats.totalProcessed}`);
    console.log(`✅ Upload-uri reușite: ${stats.successfulUploads}`);
    console.log(`❌ Upload-uri eșuate: ${stats.failedUploads}`);
    console.log(`⏭️  Deja migrate: ${stats.skippedAlreadyMigrated}`);
    console.log(`🚫 Fișiere lipsă: ${stats.skippedMissingFiles}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ ERORI:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type.toUpperCase()}: ${error.imagePath}`);
        console.log(`   📝 ${error.product || error.category || error.inspiration || error.brand}`);
        console.log(`   🔍 ${error.error}`);
      });
    }

    if (stats.successfulUploads > 0) {
      console.log('\n🎉 Re-migrarea s-a finalizat cu succes!');
      console.log('💡 Recomandare: Rulează din nou scriptul de verificare pentru a confirma rezultatele.');
    } else {
      console.log('\n ℹ️  Nu au fost găsite imagini de re-migrat.');
    }
    
  } catch (error) {
    console.error('❌ Eroare în timpul re-migrării:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Verifică dacă scriptul este rulat direct
if (require.main === module) {
  retryMigration();
}

module.exports = { retryMigration }; 