const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Inspiration = require('../src/models/Inspiration');
const Brand = require('../src/models/Brand');

// Import S3 config
const { uploadToS3, getPublicUrl } = require('../src/config/s3Config');

// Conectare la MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ideadesign');

// Statistici migrare
let stats = {
  totalFiles: 0,
  uploadedFiles: 0,
  failedFiles: 0,
  updatedProducts: 0,
  updatedCategories: 0,
  updatedInspirations: 0,
  updatedBrands: 0,
  errors: []
};

// Funcție pentru determinarea tipului de conținut
const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return contentTypes[ext] || 'application/octet-stream';
};

// Funcție pentru upload-ul unui fișier în S3
const uploadFileToS3 = async (localPath, s3Folder) => {
  try {
    if (!fs.existsSync(localPath)) {
      console.log(`❌ Fișierul nu există: ${localPath}`);
      return null;
    }

    const fileName = path.basename(localPath);
    const fileBuffer = fs.readFileSync(localPath);
    const contentType = getContentType(localPath);

    console.log(`📤 Încarcă: ${fileName} în folderul ${s3Folder}`);
    
    const result = await uploadToS3(fileBuffer, fileName, contentType, s3Folder);
    
    if (result.success) {
      stats.uploadedFiles++;
      console.log(`✅ Încărcat cu succes: ${result.url}`);
      return result.url;
    } else {
      stats.failedFiles++;
      stats.errors.push(`Eroare la încărcarea ${fileName}: ${result.error}`);
      console.log(`❌ Eroare la încărcarea ${fileName}: ${result.error}`);
      return null;
    }
  } catch (error) {
    stats.failedFiles++;
    stats.errors.push(`Eroare la încărcarea ${localPath}: ${error.message}`);
    console.log(`❌ Eroare la încărcarea ${localPath}:`, error.message);
    return null;
  }
};

// Funcție pentru migrarea imaginilor produselor
const migrateProductImages = async () => {
  console.log('\n🔄 Migrare imagini produse...');
  
  const products = await Product.find({});
  console.log(`Găsite ${products.length} produse`);

  for (const product of products) {
    if (!product.images || product.images.length === 0) continue;

    let hasChanges = false;
    const newImages = [];

    for (const imagePath of product.images) {
      // Skip dacă este deja URL S3
      if (imagePath.startsWith('https://')) {
        newImages.push(imagePath);
        continue;
      }

      // Skip default images
      if (imagePath.includes('no-photo.jpg') || imagePath.includes('default')) {
        newImages.push(imagePath);
        continue;
      }

      const localPath = path.join(__dirname, '..', imagePath);
      const s3Url = await uploadFileToS3(localPath, 'product-images');
      
      if (s3Url) {
        newImages.push(s3Url);
        hasChanges = true;
      } else {
        // Păstrează calea originală dacă upload-ul a eșuat
        newImages.push(imagePath);
      }
    }

    if (hasChanges) {
      await Product.findByIdAndUpdate(product._id, { images: newImages });
      stats.updatedProducts++;
      console.log(`✅ Actualizat produsul: ${product.name}`);
    }
  }
};

// Funcție pentru migrarea imaginilor categoriilor
const migrateCategoryImages = async () => {
  console.log('\n🔄 Migrare imagini categorii...');
  
  const categories = await Category.find({});
  console.log(`Găsite ${categories.length} categorii`);

  for (const category of categories) {
    if (!category.image) continue;

    // Skip dacă este deja URL S3
    if (category.image.startsWith('https://')) continue;

    const localPath = path.join(__dirname, '..', category.image.replace(/^\//, ''));
    const s3Url = await uploadFileToS3(localPath, 'category-images');
    
    if (s3Url) {
      await Category.findByIdAndUpdate(category._id, { image: s3Url });
      stats.updatedCategories++;
      console.log(`✅ Actualizată categoria: ${category.name}`);
    }
  }
};

// Funcție pentru migrarea imaginilor de inspirație
const migrateInspirationImages = async () => {
  console.log('\n🔄 Migrare imagini inspirație...');
  
  const inspirations = await Inspiration.find({});
  console.log(`Găsite ${inspirations.length} inspirații`);

  for (const inspiration of inspirations) {
    if (!inspiration.image) continue;

    // Skip dacă este deja URL S3
    if (inspiration.image.startsWith('https://')) continue;

    const localPath = path.join(__dirname, '..', inspiration.image.replace(/^\//, ''));
    const s3Url = await uploadFileToS3(localPath, 'inspiration-images');
    
    if (s3Url) {
      await Inspiration.findByIdAndUpdate(inspiration._id, { image: s3Url });
      stats.updatedInspirations++;
      console.log(`✅ Actualizată inspirația: ${inspiration.title}`);
    }
  }
};

// Funcție pentru migrarea logo-urilor brandurilor
const migrateBrandLogos = async () => {
  console.log('\n🔄 Migrare logo-uri branduri...');
  
  const brands = await Brand.find({});
  console.log(`Găsite ${brands.length} branduri`);

  for (const brand of brands) {
    if (!brand.logo) continue;

    // Skip dacă este deja URL S3
    if (brand.logo.startsWith('https://')) continue;

    const localPath = path.join(__dirname, '..', brand.logo.replace(/^\//, ''));
    const s3Url = await uploadFileToS3(localPath, 'brand-logos');
    
    if (s3Url) {
      await Brand.findByIdAndUpdate(brand._id, { logo: s3Url });
      stats.updatedBrands++;
      console.log(`✅ Actualizat brandul: ${brand.name}`);
    }
  }
};

// Funcție pentru calcularea statisticilor inițiale
const calculateInitialStats = async () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  
  const countFilesInDir = (dir) => {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        count += countFilesInDir(itemPath);
      } else {
        count++;
      }
    }
    return count;
  };

  stats.totalFiles = countFilesInDir(uploadsDir);
  console.log(`📊 Total fișiere găsite: ${stats.totalFiles}`);
};

// Funcția principală de migrare
const runMigration = async () => {
  console.log('🚀 Începe migrarea imaginilor către S3...\n');
  
  // Verifică configurația S3
  if (!process.env.S3_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ Configurația S3 este incompletă. Verifică variabilele de mediu:');
    console.error('- S3_BUCKET_NAME');
    console.error('- AWS_ACCESS_KEY_ID');
    console.error('- AWS_SECRET_ACCESS_KEY');
    console.error('- AWS_REGION (opțional, default: eu-west-1)');
    process.exit(1);
  }

  try {
    await calculateInitialStats();
    
    await migrateProductImages();
    await migrateCategoryImages();
    await migrateInspirationImages();
    await migrateBrandLogos();

    // Afișează statisticile finale
    console.log('\n📊 STATISTICI FINALIZARE MIGRARE');
    console.log('================================');
    console.log(`📁 Total fișiere: ${stats.totalFiles}`);
    console.log(`✅ Încărcate cu succes: ${stats.uploadedFiles}`);
    console.log(`❌ Eșuate: ${stats.failedFiles}`);
    console.log(`🔄 Produse actualizate: ${stats.updatedProducts}`);
    console.log(`🔄 Categorii actualizate: ${stats.updatedCategories}`);
    console.log(`🔄 Inspirații actualizate: ${stats.updatedInspirations}`);
    console.log(`🔄 Branduri actualizate: ${stats.updatedBrands}`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERORI:');
      stats.errors.forEach(error => console.log(`- ${error}`));
    }

    console.log('\n✅ Migrarea s-a finalizat!');
    
  } catch (error) {
    console.error('❌ Eroare în timpul migrării:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Verifică dacă scriptul este rulat direct
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration }; 