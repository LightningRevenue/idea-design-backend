const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { compressImages } = require('./imageCompression');

// Create product images directory
const productImagesDir = path.join(__dirname, '../../uploads/product_images');
if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
}

// Storage configuration for product images
const productImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productImagesDir);
    },
    filename: (req, file, cb) => {
        const fileName = uuidv4() + path.extname(file.originalname);
        cb(null, fileName);
    }
});

// File filter for product images
const productImageFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        req.fileValidationError = 'Tip de fișier invalid. Sunt permise doar fișiere JPEG, PNG, JPG, WEBP.';
        cb(null, false);
    }
};

// Multer configuration for product images with higher size limit
const productImagesUpload = multer({
    storage: productImageStorage,
    fileFilter: productImageFileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit pentru a permite imagini mari care vor fi comprimate
}).array('images', 10);

/**
 * Middleware combinat pentru upload și compresie produse
 * Gestionează upload-ul și comprimă automat imaginile mari
 */
const uploadAndCompressProductImages = (req, res, next) => {
    productImagesUpload(req, res, async function (err) {
        // Gestionează erorile de upload
        if (req.fileValidationError) {
            return res.status(400).json({ 
                success: false, 
                message: req.fileValidationError 
            });
        }
        
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
                message: `Eroare necunoscută de upload: ${err.message}` 
            });
        }

        // Aplică compresie imaginilor dacă există fișiere încărcate
        if (req.files && req.files.length > 0) {
            console.log(`🖼️  Procesăm ${req.files.length} imagini pentru produs...`);
            
            try {
                await compressImages(req, res, () => {});
                console.log('✅ Compresia imaginilor completată cu succes!');
            } catch (compressionError) {
                console.error('❌ Eroare la compresia imaginilor:', compressionError);
                // Continuă chiar dacă compresia eșuează - imaginile originale vor fi folosite
            }
        }

        // Continuă la următorul middleware/controller
        next();
    });
};

module.exports = {
    uploadAndCompressProductImages,
    productImagesUpload // Export și versiunea fără compresie pentru compatibilitate
}; 