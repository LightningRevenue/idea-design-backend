const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Inspiration = require('../src/models/Inspiration');
const Brand = require('../src/models/Brand');

// Conectare la MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ideadesign');

// Statistici
let stats = {
  totalProductImages: 0,
  migratedProductImages: 0,
  localProductImages: 0,
  missingProductImages: 0,
  totalCategoryImages: 0,
  migratedCategoryImages: 0,
  localCategoryImages: 0,
  missingCategoryImages: 0,
  totalInspirationImages: 0,
  migratedInspirationImages: 0,
  localInspirationImages: 0,
  missingInspirationImages: 0,
  totalBrandLogos: 0,
  migratedBrandLogos: 0,
  localBrandLogos: 0,
  missingBrandLogos: 0,
  missingFiles: []
};

// Funcție pentru verificarea existenței unui fișier local
const checkLocalFileExists = (imagePath) => {
  if (!imagePath) return false;
  const localPath = path.join(__dirname, '..', imagePath.replace(/^\//, ''));
  return fs.existsSync(localPath);
};

// Funcție pentru verificarea imaginilor produselor
const checkProductImages = async () => {
  console.log('\n🔍 Verificare imagini produse...');
  
  const products = await Product.find({});
  console.log(`Găsite ${products.length} produse`);

  for (const product of products) {
    if (!product.images || product.images.length === 0) continue;

    for (const imagePath of product.images) {
      if (!imagePath || imagePath.includes('no-photo.jpg') || imagePath.includes('default')) continue;

      stats.totalProductImages++;

      if (imagePath.startsWith('https://')) {
        stats.migratedProductImages++;
        console.log(`✅ S3: ${path.basename(imagePath)} (${product.name})`);
      } else {
        stats.localProductImages++;
        const exists = checkLocalFileExists(imagePath);
        if (!exists) {
          stats.missingProductImages++;
          stats.missingFiles.push({
            type: 'product',
            product: product.name,
            productId: product._id,
            imagePath: imagePath,
            reason: 'Fișierul local nu există'
          });
          console.log(`❌ LIPSĂ: ${imagePath} (${product.name})`);
        } else {
          console.log(`🔄 LOCAL: ${imagePath} (${product.name})`);
        }
      }
    }
  }
};

// Funcție pentru verificarea imaginilor categoriilor
const checkCategoryImages = async () => {
  console.log('\n🔍 Verificare imagini categorii...');
  
  const categories = await Category.find({});
  console.log(`Găsite ${categories.length} categorii`);

  for (const category of categories) {
    if (!category.image) continue;

    stats.totalCategoryImages++;

    if (category.image.startsWith('https://')) {
      stats.migratedCategoryImages++;
      console.log(`✅ S3: ${path.basename(category.image)} (${category.name})`);
    } else {
      stats.localCategoryImages++;
      const exists = checkLocalFileExists(category.image);
      if (!exists) {
        stats.missingCategoryImages++;
        stats.missingFiles.push({
          type: 'category',
          category: category.name,
          categoryId: category._id,
          imagePath: category.image,
          reason: 'Fișierul local nu există'
        });
        console.log(`❌ LIPSĂ: ${category.image} (${category.name})`);
      } else {
        console.log(`🔄 LOCAL: ${category.image} (${category.name})`);
      }
    }
  }
};

// Funcție pentru verificarea imaginilor de inspirație
const checkInspirationImages = async () => {
  console.log('\n🔍 Verificare imagini inspirație...');
  
  const inspirations = await Inspiration.find({});
  console.log(`Găsite ${inspirations.length} inspirații`);

  for (const inspiration of inspirations) {
    if (!inspiration.image) continue;

    stats.totalInspirationImages++;

    if (inspiration.image.startsWith('https://')) {
      stats.migratedInspirationImages++;
      console.log(`✅ S3: ${path.basename(inspiration.image)} (${inspiration.title})`);
    } else {
      stats.localInspirationImages++;
      const exists = checkLocalFileExists(inspiration.image);
      if (!exists) {
        stats.missingInspirationImages++;
        stats.missingFiles.push({
          type: 'inspiration',
          inspiration: inspiration.title,
          inspirationId: inspiration._id,
          imagePath: inspiration.image,
          reason: 'Fișierul local nu există'
        });
        console.log(`❌ LIPSĂ: ${inspiration.image} (${inspiration.title})`);
      } else {
        console.log(`🔄 LOCAL: ${inspiration.image} (${inspiration.title})`);
      }
    }
  }
};

// Funcție pentru verificarea logo-urilor brandurilor
const checkBrandLogos = async () => {
  console.log('\n🔍 Verificare logo-uri branduri...');
  
  const brands = await Brand.find({});
  console.log(`Găsite ${brands.length} branduri`);

  for (const brand of brands) {
    if (!brand.logo) continue;

    stats.totalBrandLogos++;

    if (brand.logo.startsWith('https://')) {
      stats.migratedBrandLogos++;
      console.log(`✅ S3: ${path.basename(brand.logo)} (${brand.name})`);
    } else {
      stats.localBrandLogos++;
      const exists = checkLocalFileExists(brand.logo);
      if (!exists) {
        stats.missingBrandLogos++;
        stats.missingFiles.push({
          type: 'brand',
          brand: brand.name,
          brandId: brand._id,
          imagePath: brand.logo,
          reason: 'Fișierul local nu există'
        });
        console.log(`❌ LIPSĂ: ${brand.logo} (${brand.name})`);
      } else {
        console.log(`🔄 LOCAL: ${brand.logo} (${brand.name})`);
      }
    }
  }
};

// Funcție pentru verificarea fișierelor orfane din uploads
const checkOrphanFiles = async () => {
  console.log('\n🔍 Verificare fișiere orfane în uploads...');
  
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const orphanFiles = [];

  const scanDirectory = (dir, relativePath = '') => {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const relativeItemPath = path.join(relativePath, item).replace(/\\/g, '/');
      
      if (fs.statSync(itemPath).isDirectory()) {
        scanDirectory(itemPath, relativeItemPath);
      } else {
        // Verifică dacă fișierul este referențiat în baza de date
        const isReferenced = checkIfFileIsReferenced(relativeItemPath);
        if (!isReferenced) {
          orphanFiles.push(relativeItemPath);
        }
      }
    }
  };

  const checkIfFileIsReferenced = (filePath) => {
    // Această verificare ar trebui să fie mai complexă în realitate
    // Pentru moment, considerăm că toate fișierele sunt potențial utile
    return true;
  };

  scanDirectory(uploadsDir);
  
  if (orphanFiles.length > 0) {
    console.log(`📁 Găsite ${orphanFiles.length} fișiere potențial orfane`);
    orphanFiles.slice(0, 10).forEach(file => console.log(`  - ${file}`));
    if (orphanFiles.length > 10) {
      console.log(`  ... și încă ${orphanFiles.length - 10} fișiere`);
    }
  }
};

// Funcția principală de verificare
const runCheck = async () => {
  console.log('🔍 Verificare stare migrare imagini către S3...\n');
  
  try {
    await checkProductImages();
    await checkCategoryImages();
    await checkInspirationImages();
    await checkBrandLogos();
    await checkOrphanFiles();

    // Afișează raportul final
    console.log('\n📊 RAPORT VERIFICARE MIGRARE');
    console.log('=====================================');
    
    console.log('\n📦 PRODUSE:');
    console.log(`  Total imagini: ${stats.totalProductImages}`);
    console.log(`  ✅ Migrate în S3: ${stats.migratedProductImages}`);
    console.log(`  🔄 Încă locale: ${stats.localProductImages}`);
    console.log(`  ❌ Lipsă: ${stats.missingProductImages}`);
    
    console.log('\n📁 CATEGORII:');
    console.log(`  Total imagini: ${stats.totalCategoryImages}`);
    console.log(`  ✅ Migrate în S3: ${stats.migratedCategoryImages}`);
    console.log(`  🔄 Încă locale: ${stats.localCategoryImages}`);
    console.log(`  ❌ Lipsă: ${stats.missingCategoryImages}`);
    
    console.log('\n💡 INSPIRAȚII:');
    console.log(`  Total imagini: ${stats.totalInspirationImages}`);
    console.log(`  ✅ Migrate în S3: ${stats.migratedInspirationImages}`);
    console.log(`  🔄 Încă locale: ${stats.localInspirationImages}`);
    console.log(`  ❌ Lipsă: ${stats.missingInspirationImages}`);
    
    console.log('\n🏷️ BRANDURI:');
    console.log(`  Total logo-uri: ${stats.totalBrandLogos}`);
    console.log(`  ✅ Migrate în S3: ${stats.migratedBrandLogos}`);
    console.log(`  🔄 Încă locale: ${stats.localBrandLogos}`);
    console.log(`  ❌ Lipsă: ${stats.missingBrandLogos}`);

    // Calculează procentajele
    const totalImages = stats.totalProductImages + stats.totalCategoryImages + stats.totalInspirationImages + stats.totalBrandLogos;
    const migratedImages = stats.migratedProductImages + stats.migratedCategoryImages + stats.migratedInspirationImages + stats.migratedBrandLogos;
    const localImages = stats.localProductImages + stats.localCategoryImages + stats.localInspirationImages + stats.localBrandLogos;
    const missingImages = stats.missingProductImages + stats.missingCategoryImages + stats.missingInspirationImages + stats.missingBrandLogos;

    console.log('\n🎯 SUMAR GENERAL:');
    console.log(`  Total imagini: ${totalImages}`);
    console.log(`  ✅ Migrate în S3: ${migratedImages} (${Math.round(migratedImages/totalImages*100)}%)`);
    console.log(`  🔄 Încă locale: ${localImages} (${Math.round(localImages/totalImages*100)}%)`);
    console.log(`  ❌ Lipsă: ${missingImages} (${Math.round(missingImages/totalImages*100)}%)`);

    // Afișează fișierele lipsă
    if (stats.missingFiles.length > 0) {
      console.log('\n❌ FIȘIERE LIPSĂ:');
      stats.missingFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.type.toUpperCase()}: ${file.imagePath}`);
        console.log(`   📝 ${file.product || file.category || file.inspiration || file.brand}`);
        console.log(`   🔍 ${file.reason}`);
      });
    }

    // Recomandări
    console.log('\n💡 RECOMANDĂRI:');
    if (localImages > 0) {
      console.log('🔄 Rulează din nou migrarea pentru imaginile locale rămase');
    }
    if (missingImages > 0) {
      console.log('❌ Verifică de ce anumite fișiere lipsesc și restaurează-le dacă este posibil');
    }
    if (migratedImages === totalImages) {
      console.log('🎉 Toate imaginile au fost migrate cu succes în S3!');
    }
    
  } catch (error) {
    console.error('❌ Eroare în timpul verificării:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Verifică dacă scriptul este rulat direct
if (require.main === module) {
  runCheck();
}

module.exports = { runCheck }; 