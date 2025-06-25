const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Middleware pentru compresie de imagini cu Sharp
 * Comprimă imaginile mari și le optimizează pentru web
 */
const compressImages = async (req, res, next) => {
  try {
    // Dacă nu sunt fișiere, continuă
    if (!req.files || req.files.length === 0) {
      return next();
    }

    console.log(`Începem compresia pentru ${req.files.length} imagini...`);
    
    // Procesează fiecare imagine
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const originalPath = file.path;
      const originalSize = fs.statSync(originalPath).size;
      
      console.log(`Procesăm imaginea ${i + 1}: ${file.originalname} (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);
      
      try {
        // Verifică dacă este într-adevăr o imagine
        const metadata = await sharp(originalPath).metadata();
        
        // Configurări pentru compresie optimă
        let sharpInstance = sharp(originalPath);
        
        // Redimensionează dacă este prea mare (max 1920px pe latura cea mai mare)
        if (metadata.width > 1920 || metadata.height > 1920) {
          sharpInstance = sharpInstance.resize(1920, 1920, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }
        
        // Determină formatul de ieșire și compresia
        let outputBuffer;
        let newExtension;
        
        if (file.mimetype === 'image/png') {
          // Pentru PNG, convertește la JPEG dacă nu are transparență
          if (!metadata.hasAlpha) {
            outputBuffer = await sharpInstance
              .jpeg({ 
                quality: 85, 
                progressive: true,
                mozjpeg: true 
              })
              .toBuffer();
            newExtension = '.jpg';
          } else {
            // Păstrează PNG pentru imagini cu transparență, dar optimizează
            outputBuffer = await sharpInstance
              .png({ 
                quality: 85,
                compressionLevel: 9,
                progressive: true
              })
              .toBuffer();
            newExtension = '.png';
          }
        } else if (file.mimetype === 'image/webp') {
          // Optimizează WebP
          outputBuffer = await sharpInstance
            .webp({ 
              quality: 85,
              effort: 6
            })
            .toBuffer();
          newExtension = '.webp';
        } else {
          // Pentru JPEG și alte formate, convertește la JPEG optimizat
          outputBuffer = await sharpInstance
            .jpeg({ 
              quality: 85, 
              progressive: true,
              mozjpeg: true 
            })
            .toBuffer();
          newExtension = '.jpg';
        }
        
        // Calculează noul nume de fișier dacă extensia s-a schimbat
        let newPath = originalPath;
        if (path.extname(originalPath).toLowerCase() !== newExtension.toLowerCase()) {
          newPath = originalPath.replace(path.extname(originalPath), newExtension);
          file.filename = file.filename.replace(path.extname(file.filename), newExtension);
        }
        
        // Scrie imaginea comprimată
        await fs.promises.writeFile(newPath, outputBuffer);
        
        // Șterge fișierul original dacă calea s-a schimbat
        if (newPath !== originalPath) {
          await fs.promises.unlink(originalPath);
          file.path = newPath;
        }
        
        const newSize = outputBuffer.length;
        const compressionRatio = ((originalSize - newSize) / originalSize * 100).toFixed(1);
        
        console.log(`✅ Imagine ${i + 1} comprimată: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(newSize / 1024 / 1024).toFixed(2)}MB (economie ${compressionRatio}%)`);
        
        // Actualizează informațiile despre fișier
        file.size = newSize;
        
      } catch (imageError) {
        console.error(`❌ Eroare la procesarea imaginii ${file.originalname}:`, imageError);
        // Dacă nu poate procesa imaginea, o lasă neschimbată
        continue;
      }
    }
    
    console.log(`✅ Toate imaginile au fost procesate cu succes!`);
    next();
    
  } catch (error) {
    console.error('❌ Eroare în middleware-ul de compresie:', error);
    // În caz de eroare, continuă fără compresie
    next();
  }
};

/**
 * Funcție pentru compresie manuală a unei singure imagini
 */
const compressSingleImage = async (inputPath, outputPath, options = {}) => {
  const {
    quality = 85,
    maxWidth = 1920,
    maxHeight = 1920,
    format = 'auto' // 'auto', 'jpeg', 'png', 'webp'
  } = options;
  
  try {
    const metadata = await sharp(inputPath).metadata();
    let sharpInstance = sharp(inputPath);
    
    // Redimensionare dacă este necesară
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Aplică compresia în funcție de format
    if (format === 'jpeg' || (format === 'auto' && metadata.format === 'jpeg')) {
      await sharpInstance
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toFile(outputPath);
    } else if (format === 'png' || (format === 'auto' && metadata.format === 'png')) {
      await sharpInstance
        .png({ quality, compressionLevel: 9, progressive: true })
        .toFile(outputPath);
    } else if (format === 'webp' || (format === 'auto' && metadata.format === 'webp')) {
      await sharpInstance
        .webp({ quality, effort: 6 })
        .toFile(outputPath);
    } else {
      // Default la JPEG pentru alte formate
      await sharpInstance
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toFile(outputPath);
    }
    
    return true;
  } catch (error) {
    console.error('Eroare la compresia imaginii:', error);
    return false;
  }
};

module.exports = {
  compressImages,
  compressSingleImage
}; 