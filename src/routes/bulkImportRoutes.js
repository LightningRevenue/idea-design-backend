const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const multer = require('multer');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { verifyAdmin } = require('../middleware/adminAuth'); // Changed: Destructure to get verifyAdmin

// Configure multer for Excel file upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Doar fișiere Excel (.xlsx, .xls) sunt acceptate!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Download Excel template
router.get('/template', verifyAdmin, async (req, res) => { // Changed: Use verifyAdmin instead of adminAuth
  try {
    // Get categories for the template
    const categories = await Category.find({}).select('name');
    const categoryNames = categories.map(cat => cat.name);

    // Create workbook
    const wb = xlsx.utils.book_new();

    // Create main sheet with headers and example data
    const mainData = [
      ['Nume Produs', 'Descriere', 'Preț', 'Stoc', 'Categorie'],
      ['Exemplu Produs 1', 'Descrierea produsului exemplu', '199.99', '10', categoryNames[0] || 'Categoria1'],
      ['Exemplu Produs 2', 'Descrierea produsului exemplu 2', '299.99', '5', categoryNames[1] || 'Categoria2']
    ];

    const ws = xlsx.utils.aoa_to_sheet(mainData);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Nume Produs
      { wch: 40 }, // Descriere
      { wch: 10 }, // Preț
      { wch: 10 }, // Stoc
      { wch: 20 }  // Categorie
    ];

    // Add main sheet
    xlsx.utils.book_append_sheet(wb, ws, 'Produse');

    // Create categories sheet for reference
    const categoryData = [
      ['Categorii Disponibile'],
      ...categoryNames.map(name => [name])
    ];

    const categoryWs = xlsx.utils.aoa_to_sheet(categoryData);
    categoryWs['!cols'] = [{ wch: 30 }];
    xlsx.utils.book_append_sheet(wb, categoryWs, 'Categorii');

    // Create instructions sheet
    const instructionsData = [
      ['INSTRUCȚIUNI PENTRU COMPLETAREA TEMPLATE-ULUI'],
      [''],
      ['1. Completați doar foaia "Produse"'],
      ['2. Nu modificați anteturile (prima linie)'],
      ['3. Ștergeți exemplele și adăugați produsele dvs.'],
      [''],
      ['CÂMPURI OBLIGATORII:'],
      ['• Nume Produs - text, maxim 100 caractere'],
      ['• Preț - număr pozitiv (ex: 199.99)'],
      ['• Stoc - număr întreg pozitiv (ex: 10)'],
      ['• Categorie - trebuie să fie exact una din categoriile din foaia "Categorii"'],
      [''],
      ['CÂMPURI OPȚIONALE:'],
      ['• Descriere - text, maxim 1000 caractere'],
      [''],
      ['OBSERVAȚII:'],
      ['• Verificați că categoria existe în foaia "Categorii"'],
      ['• Nu lăsați celule goale pentru câmpurile obligatorii'],
      ['• Prețurile folosesc punctul ca separator zecimal (ex: 199.99)']
    ];

    const instructionsWs = xlsx.utils.aoa_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ wch: 60 }];
    xlsx.utils.book_append_sheet(wb, instructionsWs, 'Instrucțiuni');

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Disposition', 'attachment; filename=template_produse.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la generarea template-ului'
    });
  }
});

// Upload and process Excel file
router.post('/upload', verifyAdmin, upload.single('excel'), async (req, res) => { // Changed: Use verifyAdmin instead of adminAuth
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nu a fost încărcat niciun fișier Excel'
      });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Fișierul Excel este gol sau nu conține date valide'
      });
    }

    // Get all categories for validation
    const categories = await Category.find({});
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat._id);
    });

    const results = {
      success: [],
      errors: [],
      total: data.length
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have headers

      try {
        // Validate required fields
        const name = row['Nume Produs']?.toString().trim();
        const price = parseFloat(row['Preț']);
        const stock = parseInt(row['Stoc']);
        const categoryName = row['Categorie']?.toString().trim();

        if (!name) {
          results.errors.push(`Linia ${rowNumber}: Nume Produs este obligatoriu`);
          continue;
        }

        if (isNaN(price) || price <= 0) {
          results.errors.push(`Linia ${rowNumber}: Preț invalid (trebuie să fie un număr pozitiv)`);
          continue;
        }

        if (isNaN(stock) || stock < 0) {
          results.errors.push(`Linia ${rowNumber}: Stoc invalid (trebuie să fie un număr întreg pozitiv)`);
          continue;
        }

        if (!categoryName) {
          results.errors.push(`Linia ${rowNumber}: Categorie este obligatorie`);
          continue;
        }

        // Find category
        const categoryId = categoryMap.get(categoryName.toLowerCase());
        if (!categoryId) {
          results.errors.push(`Linia ${rowNumber}: Categoria "${categoryName}" nu există`);
          continue;
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({ name: name });
        if (existingProduct) {
          results.errors.push(`Linia ${rowNumber}: Produsul "${name}" există deja`);
          continue;
        }

        // Create product
        const productData = {
          name: name,
          description: row['Descriere']?.toString().trim() || '',
          price: price,
          stock: stock,
          category: categoryId,
          status: 'active',
          images: [] // No images for bulk import
        };

        const product = new Product(productData);
        await product.save();

        results.success.push(`Linia ${rowNumber}: Produs "${name}" creat cu succes`);

      } catch (error) {
        results.errors.push(`Linia ${rowNumber}: Eroare la procesare - ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import finalizat: ${results.success.length} produse create, ${results.errors.length} erori`,
      results: results
    });

  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la procesarea fișierului Excel'
    });
  }
});

module.exports = router;
