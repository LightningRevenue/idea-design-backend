const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Import the Product model
const Category = require('../models/Category');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose'); // Make sure this is at the top with other requires
const { verifyAdmin } = require('../middleware/adminAuth');
const upload = require('../middleware/upload'); // This is for categories, will be unused for product image uploads now
const multer = require('multer'); // Import multer
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid'); // For unique filenames

// --- Multer configuration for Product Images ---
const productImagesDir = path.join(__dirname, '../../uploads/product_images');
if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
}

const productImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productImagesDir);
    },
    filename: (req, file, cb) => {
        const fileName = uuidv4() + path.extname(file.originalname);
        cb(null, fileName);
    }
});

const productImageFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        req.fileValidationError = 'Tip de fișier invalid. Sunt permise doar fișiere JPEG, PNG, JPG, WEBP.';
        cb(null, false);
    }
};

const productImagesUpload = multer({
    storage: productImageStorage,
    fileFilter: productImageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
}).array('images', 10); // Field name 'images', max 10 files
// --- End Multer configuration for Product Images ---

// @route   GET /api/products/download-template
// @desc    Download Excel template for bulk upload
// @access  Private (admin only)
router.get('/download-template', verifyAdmin, (req, res) => {
    try {        // Create comprehensive sample data for the template
        const templateData = [
            {
                'Name': 'Rochie Elegantă Neagră',
                'Description': 'Rochie elegantă din voal negru, perfectă pentru evenimente speciale. Design modern cu croiala feminină.',
                'Price': 299.99,
                'Stock': 15,
                'CategoryName': 'Rochii',
                'Status': 'active',
                'Specifications': '{"Material": "Voal", "Culoare": "Negru", "Talie": "Înaltă", "Lungime": "Midi"}',
                'Instructions': '["Se spală la 30°C", "Nu se calcă direct", "Se usucă la umbră"]',
                'ShippingAndReturns': 'Livrare gratuită pentru comenzi peste 200 RON. Returnare gratuită în 30 de zile.',
                'KeyFeatures': '["Design elegant", "Material premium", "Croială feminină", "Potrivit pentru evenimente"]',
                'Colors': '[{"value": "#000000", "name": "Negru"}, {"value": "#1a1a1a", "name": "Negru intens"}]',
                'IsRecommended': 'true'
            },
            {
                'Name': 'Tricou Casual Alb',
                'Description': 'Tricou din bumbac 100%, confortabil pentru purtarea zilnică. Design simplu și versatil.',
                'Price': 49.99,
                'Stock': 25,
                'CategoryName': 'Tricouri',
                'Status': 'active',
                'Specifications': '{"Material": "Bumbac 100%", "Greutate": "180g/m²", "Fit": "Regular"}',
                'Instructions': '["Se spală la 40°C", "Se poate călca", "Se poate usica la uscător"]',
                'ShippingAndReturns': 'Livrare standard 15 RON. Returnare în 14 zile.',
                'KeyFeatures': '["Bumbac natural", "Confort maxim", "Design versatil", "Ușor de întreținut"]',
                'Colors': '[{"value": "#FFFFFF", "name": "Alb"}, {"value": "#F5F5F5", "name": "Alb crem"}]',
                'IsRecommended': 'false'
            },
            {
                'Name': 'Pantaloni Eleganți Bleumarin',
                'Description': 'Pantaloni eleganți din material premium, potriviți pentru birou și ocazii speciale.',
                'Price': 179.99,
                'Stock': 12,
                'CategoryName': 'Pantaloni',
                'Status': 'draft',
                'Specifications': '{"Material": "Poliester 65%, Viscoză 35%", "Croială": "Slim fit", "Lungime": "Regulară"}',
                'Instructions': '["Curățare chimică recomandată", "Se poate spăla la 30°C", "Se calcă la temperatură medie"]',
                'ShippingAndReturns': 'Livrare expresă disponibilă. Schimb gratuit pentru mărime în 7 zile.',
                'KeyFeatures': '["Material premium", "Croială elegantă", "Versatili", "Rezistenți la șifonare"]',
                'Colors': '[{"value": "#000080", "name": "Bleumarin"}, {"value": "#191970", "name": "Bleumarin închis"}]',
                'IsRecommended': 'true'
            }
        ];

        // Create workbook and add instructions worksheet FIRST
        const workbook = xlsx.utils.book_new();
        
        // Create instructions worksheet
        const instructionsData = [
            { 'Câmp': 'Name', 'Tip': 'OBLIGATORIU', 'Descriere': 'Numele produsului', 'Exemplu': 'Rochie Elegantă Neagră', 'Observații': 'Maxim 100 caractere' },
            { 'Câmp': 'Description', 'Tip': 'OBLIGATORIU', 'Descriere': 'Descrierea detaliată', 'Exemplu': 'Rochie din voal negru...', 'Observații': 'Maxim 1000 caractere' },
            { 'Câmp': 'Price', 'Tip': 'OBLIGATORIU', 'Descriere': 'Prețul în RON', 'Exemplu': '299.99', 'Observații': 'Doar numere cu punctul ca separator' },
            { 'Câmp': 'Stock', 'Tip': 'OBLIGATORIU', 'Descriere': 'Cantitatea în stoc', 'Exemplu': '15', 'Observații': 'Doar numere întregi' },
            { 'Câmp': 'CategoryName', 'Tip': 'OBLIGATORIU', 'Descriere': 'Numele categoriei', 'Exemplu': 'Rochii', 'Observații': 'Trebuie să existe în sistem' },
            { 'Câmp': 'Status', 'Tip': 'OPȚIONAL', 'Descriere': 'Statusul produsului', 'Exemplu': 'active', 'Observații': 'active/draft/archived' },
            { 'Câmp': 'Specifications', 'Tip': 'OPȚIONAL', 'Descriere': 'Specificații tehnice', 'Exemplu': '{"Material": "Voal"}', 'Observații': 'Format JSON valid' },
            { 'Câmp': 'Instructions', 'Tip': 'OPȚIONAL', 'Descriere': 'Instrucțiuni utilizare', 'Exemplu': '["Se spală la 30°C"]', 'Observații': 'Array JSON valid' },
            { 'Câmp': 'ShippingAndReturns', 'Tip': 'OPȚIONAL', 'Descriere': 'Info livrare/returnare', 'Exemplu': 'Livrare gratuită...', 'Observații': 'Text liber' },
            { 'Câmp': 'KeyFeatures', 'Tip': 'OPȚIONAL', 'Descriere': 'Caracteristici principale', 'Exemplu': '["Design elegant"]', 'Observații': 'Array JSON valid' },
            { 'Câmp': 'Colors', 'Tip': 'OPȚIONAL', 'Descriere': 'Culori disponibile', 'Exemplu': '[{"value": "#000", "name": "Negru"}]', 'Observații': 'Array obiecte JSON' },
            { 'Câmp': 'IsRecommended', 'Tip': 'OPȚIONAL', 'Descriere': 'Produs recomandat', 'Exemplu': 'true', 'Observații': 'true sau false' }
        ];
        
        const instructionsWorksheet = xlsx.utils.json_to_sheet(instructionsData);
        
        // Set column widths for instructions
        const instructionsWidths = [
            { wch: 20 }, // Câmp
            { wch: 12 }, // Tip
            { wch: 30 }, // Descriere
            { wch: 35 }, // Exemplu
            { wch: 25 }  // Observații
        ];
        instructionsWorksheet['!cols'] = instructionsWidths;
        
        // Add the instructions worksheet FIRST (it will be the default sheet)
        xlsx.utils.book_append_sheet(workbook, instructionsWorksheet, 'Instrucțiuni');
        
        // Create template worksheet with sample data
        const worksheet = xlsx.utils.json_to_sheet(templateData);
          // Set column widths for better readability
        const columnWidths = [
            { wch: 25 }, // Name
            { wch: 50 }, // Description
            { wch: 10 }, // Price
            { wch: 8 },  // Stock
            { wch: 15 }, // CategoryName
            { wch: 10 }, // Status
            { wch: 40 }, // Specifications
            { wch: 40 }, // Instructions
            { wch: 50 }, // ShippingAndReturns
            { wch: 40 }, // KeyFeatures
            { wch: 30 }, // Colors
            { wch: 12 }  // IsRecommended
        ];
        worksheet['!cols'] = columnWidths;
        
        // Add the template worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Template Produse');
        
        // Create buffer from workbook
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=template-produse-complet.xlsx');
        res.setHeader('Content-Length', buffer.length);
        
        // Send the file
        res.send(buffer);
    } catch (error) {
        console.error('Error generating template:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Eroare la generarea template-ului Excel',
            error: error.message 
        });
    }
});

// @route   GET /api/products/recommended
// @desc    Get all recommended products
// @access  Public
router.get('/recommended', async (req, res) => {
    console.log('GET /api/products/recommended route hit');
    try {
        console.log('Trying to fetch recommended products');
        const recommendedProducts = await Product.find({ isRecommended: true, status: 'active' })
            .populate('category', 'name')
            .sort({ createdAt: -1 });
        
        console.log('Found recommended products:', recommendedProducts.length);
        res.json({
            success: true,
            data: recommendedProducts
        });
    } catch (err) {
        console.error('Error fetching recommended products:', err);        res.status(500).json({
            success: false,
            message: 'Eroare la încărcarea produselor recomandate'
        });
    }
});

// Multer config for Excel upload (separate from images)
const excelStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const excelDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(excelDir)) {
            fs.mkdirSync(excelDir, { recursive: true });
        }
        cb(null, excelDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bulk-products-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadExcel = multer({
    storage: excelStorage,
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
            req.fileValidationError = 'Doar fișiere Excel (.xlsx, .xls) sunt permise!';
            return cb(null, false);
        }
        cb(null, true);
    }
}).single('excel');

// @route   POST /api/products/bulk-upload
// @desc    Bulk upload products from Excel
// @access  Private (admin only)
router.post('/bulk-upload', verifyAdmin, (req, res) => {
    uploadExcel(req, res, async function (err) {
        if (req.fileValidationError) {
            return res.status(400).json({ success: false, message: req.fileValidationError });
        }
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: `Multer error: ${err.message}` });
        }
        if (err) {
            return res.status(500).json({ success: false, message: `Unknown upload error: ${err.message}` });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Fișierul Excel este necesar.' });
        }

        try {
            // Parse Excel
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet);

            if (!Array.isArray(rows) || rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Fișierul Excel nu conține date.' });
            }            // Mapare și inserare produse
            let created = 0, failed = 0, errors = [];
            for (const row of rows) {
                try {
                    // Verifică câmpurile obligatorii
                    const name = row.name || row.Name;
                    const description = row.description || row.Description;
                    const price = row.price || row.Price;
                    const stock = row.stock || row.Stock;
                    const categoryName = row.category || row.Category || row.CategoryName;

                    if (!name) throw new Error('Câmpul "Name" este obligatoriu.');
                    if (!description) throw new Error('Câmpul "Description" este obligatoriu.');
                    if (!price && price !== 0) throw new Error('Câmpul "Price" este obligatoriu.');
                    if (!stock && stock !== 0) throw new Error('Câmpul "Stock" este obligatoriu.');
                    if (!categoryName) throw new Error('Câmpul "CategoryName" este obligatoriu.');

                    // Caută categoria după nume
                    let categoryId = null;
                    const category = await Category.findOne({ name: categoryName });
                    if (!category) throw new Error(`Categoria '${categoryName}' nu există în sistem.`);
                    categoryId = category._id;

                    // Creează produsul cu toate câmpurile disponibile
                    const productData = {
                        name,
                        description,
                        price: Number(price),
                        stock: Number(stock),
                        category: categoryId,
                        status: row.status || row.Status || 'draft',
                        images: ['uploads/default/no-photo.jpg']
                    };

                    // Adaugă câmpurile opționale doar dacă sunt prezente
                    // Parse Specifications (JSON string) - OPȚIONAL
                    if (row.specifications || row.Specifications) {
                        try {
                            const specStr = row.specifications || row.Specifications;
                            if (specStr && specStr.trim()) {
                                productData.specifications = typeof specStr === 'string' ? JSON.parse(specStr) : specStr;
                            }
                        } catch (e) {
                            console.warn(`JSON invalid pentru specifications la produsul ${name}:`, e.message);
                            // Nu oprește procesarea, doar ignoră acest câmp
                        }
                    }

                    // Parse Instructions (JSON array) - OPȚIONAL
                    if (row.instructions || row.Instructions) {
                        try {
                            const instrStr = row.instructions || row.Instructions;
                            if (instrStr && instrStr.trim()) {
                                productData.instructions = typeof instrStr === 'string' ? JSON.parse(instrStr) : instrStr;
                            }
                        } catch (e) {
                            console.warn(`JSON invalid pentru instructions la produsul ${name}:`, e.message);
                        }
                    }

                    // Shipping and Returns - OPȚIONAL
                    if (row.shippingAndReturns || row.ShippingAndReturns) {
                        const shippingStr = row.shippingAndReturns || row.ShippingAndReturns;
                        if (shippingStr && shippingStr.trim()) {
                            productData.shippingAndReturns = shippingStr;
                        }
                    }

                    // Parse Key Features (JSON array) - OPȚIONAL
                    if (row.keyFeatures || row.KeyFeatures) {
                        try {
                            const featStr = row.keyFeatures || row.KeyFeatures;
                            if (featStr && featStr.trim()) {
                                productData.keyFeatures = typeof featStr === 'string' ? JSON.parse(featStr) : featStr;
                            }
                        } catch (e) {
                            console.warn(`JSON invalid pentru keyFeatures la produsul ${name}:`, e.message);
                        }
                    }

                    // Parse Colors (JSON array) - OPȚIONAL
                    if (row.colors || row.Colors) {
                        try {
                            const colorsStr = row.colors || row.Colors;
                            if (colorsStr && colorsStr.trim()) {
                                productData.colors = typeof colorsStr === 'string' ? JSON.parse(colorsStr) : colorsStr;
                            }
                        } catch (e) {
                            console.warn(`JSON invalid pentru colors la produsul ${name}:`, e.message);
                        }
                    }

                    // Is Recommended (boolean) - OPȚIONAL
                    if (row.isRecommended || row.IsRecommended) {
                        const recValue = row.isRecommended || row.IsRecommended;
                        productData.isRecommended = recValue === 'true' || recValue === true || recValue === 1;
                    }

                    await Product.create(productData);
                    created++;
                } catch (e) {
                    failed++;
                    errors.push({ 
                        row: `Rândul cu produsul "${row.name || row.Name || 'Necunoscut'}"`, 
                        error: e.message 
                    });
                }
            }


            // Șterge fișierul Excel după procesare
            fs.unlink(req.file.path, () => {});

            res.json({
                success: true,
                message: `Bulk upload finalizat: ${created} produse create, ${failed} erori.`,
                created,
                failed,
                errors
            });
        } catch (e) {
            res.status(500).json({ success: false, message: 'Eroare la procesarea fișierului Excel.', error: e.message });
        }
    });
});

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Fetch products and populate the 'category' field to get category details
    const products = await Product.find().populate('category', 'name'); // Populate only name field of category
    
    console.log('GET /api/products - Fetched products:', products.length); 

    res.json({
      success: true,
      count: products.length,
      data: products 
    });
  } catch (err) {
    console.error('Error in GET /api/products:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get a single product by ID
// @access  Public
router.get('/:id', async (req, res) => {
    console.log(`GET /api/products/:id route hit with ID: ${req.params.id}`);
    
    // Check if this is actually the recommended route that's being caught (shouldn't happen but just to be safe)
    if (req.params.id === 'recommended') {
        console.log('Redirecting /recommended to the correct handler');
        return res.redirect('/api/products/recommended');
    }
    
    try {
        const productId = req.params.id;
        // Validate if the ID is a valid MongoDB ObjectId before querying
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            console.log(`Invalid ObjectId format for ID: ${productId}`);
            return res.status(400).json({ success: false, message: 'Invalid product ID format' });
        }

        console.log(`Attempting to find product with ID: ${productId}`);
        const product = await Product.findById(productId).populate('category', 'name');

        if (!product) {
            console.log(`Product with ID ${productId} not found in database.`);
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        console.log(`Product found: ${product.name}`);
        res.json({ success: true, data: product });

    } catch (err) {
        console.error(`Error in GET /api/products/${req.params.id}: ${err.message}`, err);
        // More specific error check for CastError (often from invalid ID format during query)
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
             console.error(`CastError: Invalid ObjectId format during findById for ID ${req.params.id}`);
            return res.status(400).json({ success: false, message: 'Invalid product ID format during query' });
        }
        res.status(500).json({ success: false, message: 'Server Error while fetching product' });
    }
});

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (admin only)
router.post('/', verifyAdmin, (req, res) => {
    productImagesUpload(req, res, async function (err) {
        if (req.fileValidationError) {
            return res.status(400).json({ success: false, message: req.fileValidationError });
        }
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: `Multer error: ${err.message}` });
        }
        if (err) {
            return res.status(500).json({ success: false, message: `Unknown upload error: ${err.message}` });
        }        try {
            console.log('POST /api/products hit on backend');
            console.log('Request Body:', req.body);
            console.log('Request Files (from multer):', req.files);            const { name, description, price, stock, category, status, specifications, instructions, shippingAndReturns, keyFeatures, colors, youtubeUrl, technicalDatasheetUrl } = req.body;

            if (!name || !description || !price || !stock || !category) {
                return res.status(400).json({ success: false, message: 'Please provide all required fields: name, description, price, stock, category' });
            }

            // Handle images array
            let images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map(file => `uploads/product_images/${file.filename}`.replace(/\\/g, '/'));
            } else {
                images = ['uploads/default/no-photo.jpg'];
            }

            let parsedColors = [];
            if (colors) {
                let arr = typeof colors === 'string' ? JSON.parse(colors) : colors;
                parsedColors = arr.map(c => {
                    if (typeof c === 'string') return { value: c, name: '' };
                    if (typeof c === 'object' && c !== null) return { value: c.value || '', name: c.name || '' };
                    return { value: '', name: '' };
                });
            }

            const newProduct = new Product({
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock, 10),
                category,
                status: status || 'draft',
                images,
                specifications: specifications ? JSON.parse(specifications) : {},
                instructions: instructions ? JSON.parse(instructions) : [],
                shippingAndReturns: shippingAndReturns || '',                keyFeatures: keyFeatures ? JSON.parse(keyFeatures) : [],
                colors: parsedColors,
                youtubeUrl: youtubeUrl || '',
                technicalDatasheetUrl: technicalDatasheetUrl || ''
            });

            const savedProduct = await newProduct.save();
            const productWithCategory = await Product.findById(savedProduct._id).populate('category', 'name');

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: productWithCategory 
            });

        } catch (dbErr) {
            console.error('Error in POST /api/products (database operation):', dbErr.message);
            // If files were uploaded but DB save failed, delete all uploaded files
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    fs.unlink(file.path, (unlinkErr) => {
                        if (unlinkErr) console.error("Error deleting orphaned file:", unlinkErr);
                    });
                });
            }
            if (dbErr.name === 'ValidationError') {
                const messages = Object.values(dbErr.errors).map(val => val.message);
                return res.status(400).json({ success: false, message: messages.join(', ') });
            }
            res.status(500).json({ success: false, message: 'Server Error while creating product' });
        }
    });
});

// @route   PUT /api/products/:id
// @desc    Update a product by id
// @access  Private (admin only)
router.put('/:id', verifyAdmin, (req, res) => {
    productImagesUpload(req, res, async function (err) {
        if (req.fileValidationError) {
            return res.status(400).json({ success: false, message: req.fileValidationError });
        }
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: `Multer error: ${err.message}` });
        }
        if (err) {
            return res.status(500).json({ success: false, message: `Unknown upload error: ${err.message}` });
        }

        console.log('PUT /api/products/:id route hit with ID:', req.params.id);
        console.log('Request Body:', req.body);
        console.log('Request File (from multer):', req.file);

        try {
            const productId = req.params.id;
            
            // Validate if the ID is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({ success: false, message: 'Invalid product ID format' });
            }

            // Find the existing product to check if it exists and to get current image if needed
            const existingProduct = await Product.findById(productId);
            if (!existingProduct) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }            // Extract fields from the request body
            const { name, description, price, stock, category, status, specifications, instructions, shippingAndReturns, keyFeatures, colors, youtubeUrl, technicalDatasheetUrl } = req.body;

            // Basic validation of required fields
            if (!name || !description || !price || !stock || !category) {
                return res.status(400).json({ success: false, message: 'Please provide all required fields: name, description, price, stock, category' });
            }

            // Build the update object for the product
            const updateData = {
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock, 10),
                category,
                status: status || 'draft',
                // specifications, instructions, and shippingAndReturns will be handled separately
                // to allow for partial updates and correct parsing if they are sent as JSON strings
            };

            if (specifications !== undefined) {
                try {
                    updateData.specifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON format for specifications.' });
                }
            }

            if (instructions !== undefined) {
                try {
                    updateData.instructions = typeof instructions === 'string' ? JSON.parse(instructions) : instructions;
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON format for instructions.' });
                }
            }

            if (shippingAndReturns !== undefined) {
                updateData.shippingAndReturns = shippingAndReturns;
            }

            if (keyFeatures !== undefined) {
                try {
                    updateData.keyFeatures = typeof keyFeatures === 'string' ? JSON.parse(keyFeatures) : keyFeatures;
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON format for keyFeatures.' });
                }
            }            if (colors !== undefined) {
                let parsedColors = [];
                let arr = typeof colors === 'string' ? JSON.parse(colors) : colors;
                parsedColors = arr.map(c => {
                    if (typeof c === 'string') return { value: c, name: '' };
                    if (typeof c === 'object' && c !== null) return { value: c.value || '', name: c.name || '' };
                    return { value: '', name: '' };
                });
                updateData.colors = parsedColors;
            }            if (youtubeUrl !== undefined) {
                updateData.youtubeUrl = youtubeUrl || '';
            }

            if (technicalDatasheetUrl !== undefined) {
                updateData.technicalDatasheetUrl = technicalDatasheetUrl || '';
            }

            // Handle images update with better management
            const { currentImages } = req.body;
            let finalImages = [];

            // If currentImages is provided, it means frontend is managing image order and deletions
            if (currentImages) {
                try {
                    const parsedCurrentImages = JSON.parse(currentImages);
                    finalImages = [...parsedCurrentImages];
                } catch (e) {
                    console.error('Error parsing currentImages:', e);
                    finalImages = [...existingProduct.images];
                }
            } else {
                // Fallback: keep existing images
                finalImages = [...existingProduct.images];
            }

            // Add new images if uploaded
            if (req.files && req.files.length > 0) {
                const newImagePaths = req.files.map(file => `uploads/product_images/${file.filename}`.replace(/\\/g, '/'));
                finalImages = [...finalImages, ...newImagePaths];
            }

            // Update images in database
            if (currentImages || (req.files && req.files.length > 0)) {
                updateData.images = finalImages;
                
                // Clean up orphaned images (images that were in existingProduct but not in finalImages)
                if (Array.isArray(existingProduct.images)) {
                    existingProduct.images.forEach(imgPath => {
                        if (imgPath && !imgPath.includes('no-photo.jpg') && !finalImages.includes(imgPath)) {
                            const oldImagePath = path.join(__dirname, '../../', imgPath);
                            fs.unlink(oldImagePath, (unlinkErr) => {
                                if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                                    console.error("Error deleting orphaned product image:", unlinkErr);
                                }
                            });
                        }
                    });
                }
            }

            console.log('Updating product with data:', updateData);
            // Update the product in the database
            const updatedProduct = await Product.findByIdAndUpdate(
                productId, 
                updateData,
                { new: true, runValidators: true } // Returns the updated document and runs validators
            ).populate('category', 'name');

            res.json({
                success: true,
                message: 'Product updated successfully',
                data: updatedProduct
            });

        } catch (err) {
            console.error('Error in PUT /api/products/:id:', err.message, err);
            // Check for validation errors
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(val => val.message);
                return res.status(400).json({ success: false, message: messages.join(', ') });
            }
            // Check for CastError (often from invalid ID format)
            if (err.name === 'CastError' && err.kind === 'ObjectId') {
                return res.status(400).json({ success: false, message: 'Invalid product ID format during update' });
            }
            res.status(500).json({ success: false, message: 'Server Error while updating product' });
        }
    });
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    console.log(`DELETE /api/products/:id route hit with ID: ${req.params.id}`);
    try {
        const productId = req.params.id;
        
        // Validate if the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID format' });
        }

        // Find the product first to check if it exists and to get the image path
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Delete the product from the database
        const result = await Product.findByIdAndDelete(productId);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Delete the product's image file if it exists and is not the default
        if (product.image && !product.image.includes('no-photo.jpg')) {
            const imagePath = path.join(__dirname, '../../', product.image);
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr && !unlinkErr.code === 'ENOENT') { // ENOENT = file doesn't exist, which is fine
                    console.error("Error deleting product image during product deletion:", unlinkErr);
                }
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (err) {
        console.error('Error in DELETE /api/products/:id:', err.message, err);
        // Check for CastError (often from invalid ID format)
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'Invalid product ID format' });
        }
        res.status(500).json({ success: false, message: 'Server Error while deleting product' });
    }
});

module.exports = router;
