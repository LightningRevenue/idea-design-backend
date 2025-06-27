const multer = require('multer');
const { uploadToS3 } = require('../config/s3Config');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configurare multer pentru memory storage (nu salvăm pe disk)
const memoryStorage = multer.memoryStorage();

// Filter pentru tipuri de imagini permise
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    req.fileValidationError = 'Tip de fișier invalid. Sunt permise doar fișiere JPEG, PNG, JPG, WEBP, GIF.';
    cb(null, false);
  }
};

// Configurare multer base
const createMulterConfig = (options = {}) => {
  const { 
    fileSize = 20 * 1024 * 1024, // 20MB default
    fileCount = 10 
  } = options;

  return {
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: { 
      fileSize: fileSize,
      files: fileCount 
    }
  };
};

// Middleware pentru upload imagini produse
const uploadProductImages = multer(createMulterConfig()).array('images', 10);

// Middleware pentru upload imagine singulară (categorii, inspirații, etc.)
const uploadSingleImage = multer(createMulterConfig({ fileSize: 5 * 1024 * 1024 })).single('image');

// Middleware pentru upload logo brand
const uploadBrandLogo = multer(createMulterConfig({ fileSize: 5 * 1024 * 1024 })).single('logo');

// Funcție helper pentru procesarea upload-ului în S3
const processS3Upload = async (req, res, next, s3Folder) => {
  try {
    // Verifică erorile de validare
    if (req.fileValidationError) {
      return res.status(400).json({ 
        success: false, 
        message: req.fileValidationError 
      });
    }

    // Procesează fișierele multiple
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        const fileName = uuidv4() + path.extname(file.originalname);
        const result = await uploadToS3(file.buffer, fileName, file.mimetype, s3Folder);
        
        if (result.success) {
          return result.url;
        } else {
          throw new Error(`Eroare la încărcarea ${file.originalname}: ${result.error}`);
        }
      });

      try {
        req.uploadedUrls = await Promise.all(uploadPromises);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }

    // Procesează fișierul singular
    if (req.file) {
      const fileName = uuidv4() + path.extname(req.file.originalname);
      const result = await uploadToS3(req.file.buffer, fileName, req.file.mimetype, s3Folder);
      
      if (result.success) {
        req.uploadedUrl = result.url;
      } else {
        return res.status(500).json({
          success: false,
          message: `Eroare la încărcarea fișierului: ${result.error}`
        });
      }
    }

    next();
  } catch (error) {
    console.error('Eroare în processS3Upload:', error);
    return res.status(500).json({
      success: false,
      message: `Eroare la procesarea upload-ului: ${error.message}`
    });
  }
};

// Middleware-uri specifice pentru diferite tipuri de upload
const uploadAndProcessProductImages = (req, res, next) => {
  uploadProductImages(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'Fișierul este prea mare. Mărimea maximă permisă este 20MB.' 
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: `Eroare de upload: ${err.message}` 
      });
    }
    
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: `Eroare necunoscută: ${err.message}` 
      });
    }

    processS3Upload(req, res, next, 'product-images');
  });
};

const uploadAndProcessCategoryImage = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'Fișierul este prea mare. Mărimea maximă permisă este 5MB.' 
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: `Eroare de upload: ${err.message}` 
      });
    }
    
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: `Eroare necunoscută: ${err.message}` 
      });
    }

    processS3Upload(req, res, next, 'category-images');
  });
};

const uploadAndProcessInspirationImage = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'Fișierul este prea mare. Mărimea maximă permisă este 5MB.' 
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: `Eroare de upload: ${err.message}` 
      });
    }
    
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: `Eroare necunoscută: ${err.message}` 
      });
    }

    processS3Upload(req, res, next, 'inspiration-images');
  });
};

const uploadAndProcessBrandLogo = (req, res, next) => {
  uploadBrandLogo(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'Fișierul este prea mare. Mărimea maximă permisă este 5MB.' 
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: `Eroare de upload: ${err.message}` 
      });
    }
    
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: `Eroare necunoscută: ${err.message}` 
      });
    }

    processS3Upload(req, res, next, 'brand-logos');
  });
};

module.exports = {
  uploadAndProcessProductImages,
  uploadAndProcessCategoryImage,
  uploadAndProcessInspirationImage,
  uploadAndProcessBrandLogo,
  processS3Upload
}; 