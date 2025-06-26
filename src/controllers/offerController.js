const Offer = require('../models/Offer');
const Product = require('../models/Product');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Funcție pentru a elimina diacriticele
function removeDiacritics(str) {
  if (!str) return '';
  return str
    .replace(/ă/g, 'a').replace(/Ă/g, 'A')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/ș/g, 's').replace(/Ș/g, 'S')
    .replace(/ț/g, 't').replace(/Ț/g, 'T')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ţ/g, 't').replace(/Ţ/g, 'T');
}

// Informațiile companiei
const COMPANY_INFO = {
  name: 'S.C. Steliana Design S.R.L.',
  cui: '25944390',
  regCom: 'J2009009210401',
  address: 'Calea 13 Septembrie nr 65-69, bloc 65-67, scara 1, parter, sector 5, București',
  phones: ['0740 008 638', '0769 076 075'],
  email: 'contact@idea-design.ro',
  website: 'https://idea-design.ro',
  schedule: {
    'Luni - Vineri': '09:00 - 18:00',
    'Sâmbătă': '10:00 - 14:00',
    'Duminică': 'Închis'
  },
  defaultValidityDays: 30, // Valabilitate standard 30 zile
  contactMessage: 'Pentru intrebari sau comenzi, va rugam sa ne contactati:'
};

// @desc    Get all offers
// @route   GET /api/offers
// @access  Private
exports.getOffers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      filter.$or = [
        { offerNumber: { $regex: req.query.search, $options: 'i' } },
        { 'clientInfo.name': { $regex: req.query.search, $options: 'i' } },
        { 'clientInfo.company': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const offers = await Offer.find(filter)
      .populate('items.product', 'name price slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Offer.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: offers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single offer
// @route   GET /api/offers/:id
// @access  Private
exports.getOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('items.product', 'name price description category slug');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nu a fost găsită'
      });
    }



    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new offer
// @route   POST /api/offers
// @access  Private
exports.createOffer = async (req, res, next) => {
  try {
    // Generează numărul ofertei
    const offerNumber = await Offer.generateOfferNumber();

    // Separă produsele normale de cele custom
    const normalItems = req.body.items.filter(item => !item.isCustomProduct && item.product);
    const customItems = req.body.items.filter(item => item.isCustomProduct);
    
    // Verifică dacă produsele normale există
    let products = [];
    if (normalItems.length > 0) {
      const productIds = normalItems.map(item => item.product);
      products = await Product.find({ _id: { $in: productIds } });
      
      if (products.length !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Unul sau mai multe produse nu au fost găsite'
        });
      }
    }

    // Validează și completează informațiile pentru items
    const validatedItems = req.body.items.map(item => {
      if (item.isCustomProduct) {
        // Produs custom
        return {
          isCustomProduct: true,
          customProductName: item.customProductName || 'Produs Custom',
          customProductDescription: item.customProductDescription || '',
          quantity: parseInt(item.quantity) || 1,
          originalPrice: parseFloat(item.originalPrice) || 0,
          discountPercentage: parseFloat(item.discountPercentage) || 0,
          discountAmount: parseFloat(item.discountAmount) || 0,
          notes: item.notes || ''
        };
      } else {
        // Produs normal
        const product = products.find(p => p._id.toString() === item.product);
        return {
          product: item.product,
          isCustomProduct: false,
          quantity: parseInt(item.quantity) || 1,
          originalPrice: parseFloat(item.originalPrice) || product.price,
          discountPercentage: parseFloat(item.discountPercentage) || 0,
          discountAmount: parseFloat(item.discountAmount) || 0,
          notes: item.notes || ''
        };
      }
    });

    const offerData = {
      ...req.body,
      offerNumber,
      items: validatedItems,
      globalDiscountPercentage: parseFloat(req.body.globalDiscountPercentage) || 0,
      globalDiscountAmount: parseFloat(req.body.globalDiscountAmount) || 0,
      createdBy: req.user?.name || 'Admin'
    };

    const offer = await Offer.create(offerData);
    
    // Populate pentru response
    await offer.populate('items.product', 'name price description slug');

    res.status(201).json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update offer
// @route   PUT /api/offers/:id
// @access  Private
exports.updateOffer = async (req, res, next) => {
  try {
    let offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nu a fost găsită'
      });
    }

    // Verifică dacă oferta poate fi modificată
    if (offer.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Oferta acceptată nu poate fi modificată'
      });
    }

    offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('items.product', 'name price description slug');

    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete offer
// @route   DELETE /api/offers/:id
// @access  Private
exports.deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nu a fost găsită'
      });
    }

    await offer.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update offer status
// @route   PUT /api/offers/:id/status
// @access  Private
exports.updateOfferStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('items.product', 'name price slug');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nu a fost găsită'
      });
    }

    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate PDF for offer
// @route   GET /api/offers/:id/pdf
// @access  Private
exports.generateOfferPDF = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('items.product', 'name description slug');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nu a fost găsită'
      });
    }

    // Creează documentul PDF cu encoding UTF-8
    const doc = new PDFDocument({ 
      margin: 40, 
      size: 'A4',
      bufferPages: true,
      info: {
        Title: `Oferta ${offer.offerNumber}`,
        Author: 'Idea Design',
        Subject: 'Oferta comerciala',
        Creator: 'Idea Design System'
      }
    });
    
    // Set headers pentru download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="oferta-${offer.offerNumber}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Pipe documentul către response
    doc.pipe(res);

    // Folosește font-ul standard
    doc.font('Helvetica');

    // Header cu logo și informații companie
    await addCompanyHeader(doc);
    
    // Informații ofertă
    addOfferInfo(doc, offer);
    
    // Informații client
    addClientInfo(doc, offer);
    
    // Tabel cu produse
    const tableEndY = await addProductsTable(doc, offer);
    
    // Totale
    const totalsEndY = addTotals(doc, offer, tableEndY);
    
    // Termeni și condiții
    addTermsAndConditions(doc, offer, totalsEndY);
    
    // Footer
    addFooter(doc, offer);

    // Finalizează documentul
    doc.end();

  } catch (error) {
    console.error('PDF Generation Error:', error);
    next(error);
  }
};

// Funcții helper pentru PDF
async function addCompanyHeader(doc) {
  const pageWidth = doc.page.width;
  const margin = 40;
  
  // Background header
  doc.rect(0, 0, pageWidth, 120)
     .fillColor('#f8f9fa')
     .fill();
  
  // Logo
  try {
    const logoPath = path.join(__dirname, '../../assets/logo-png.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, margin, 15, { 
        width: 80, 
        height: 80 
      });
    }
  } catch (err) {
    console.log('Eroare la încărcarea logo-ului:', err);
    // Fallback la text dacă logo-ul nu se încarcă
    doc.fontSize(28)
       .fillColor('#d4af37')
       .font('Helvetica-Bold')
       .text('IDEA DESIGN', margin, 25);
    
    doc.fontSize(14)
       .fillColor('#6c757d')
       .font('Helvetica')
       .text('Design & Decoratiuni Interioare', margin, 55);
  }
  
  // Informații companie în dreapta
  const rightX = pageWidth - 250;
  doc.fontSize(10)
     .fillColor('#333333')
     .text(COMPANY_INFO.name, rightX, 25)
     .text(`CUI: ${COMPANY_INFO.cui}`, rightX, 38)
     .text(`Reg. Com.: ${COMPANY_INFO.regCom}`, rightX, 51)
     .text(`Tel: ${COMPANY_INFO.phones[0]}`, rightX, 64)
     .text(`     ${COMPANY_INFO.phones[1]}`, rightX, 77)
     .text(`Email: ${COMPANY_INFO.email}`, rightX, 90);
  
  // Linie separator elegantă
  doc.moveTo(margin, 125)
     .lineTo(pageWidth - margin, 125)
     .strokeColor('#d4af37')
     .lineWidth(2)
     .stroke();
}

function addOfferInfo(doc, offer) {
  const margin = 40;
  const pageWidth = doc.page.width;
  const y = 150;
  
  // Titlu principal
  doc.fontSize(22)
     .fillColor('#333333')
     .font('Helvetica-Bold')
     .text('OFERTA DE PRET', margin, y);
  
  // Box pentru informații ofertă
  doc.rect(margin, y + 35, pageWidth - 2 * margin, 60)
     .fillColor('#f8f9fa')
     .fill()
     .strokeColor('#dee2e6')
     .stroke();
  
  // Informații ofertă în box
  doc.fontSize(11)
     .fillColor('#333333')
     .font('Helvetica')
     .text(`Numarul ofertei: ${offer.offerNumber}`, margin + 15, y + 50)
     .text(`Data emiterii: ${offer.createdAt.toLocaleDateString('ro-RO')}`, margin + 15, y + 65);
  
  // Partea dreaptă
  doc.text(`Valabila pana la: ${offer.validUntil.toLocaleDateString('ro-RO')}`, pageWidth - 200, y + 50)
     .text(`Status: ${removeDiacritics(getStatusText(offer.status))}`, pageWidth - 200, y + 65);
}

function addClientInfo(doc, offer) {
  const margin = 40;
  const pageWidth = doc.page.width;
  const y = 280;
  
  // Titlu secțiune
  doc.fontSize(16)
     .fillColor('#333333')
     .font('Helvetica-Bold')
     .text('INFORMATII CLIENT', margin, y);
  
  // Box pentru informații client
  const boxHeight = 80;
  doc.rect(margin, y + 25, pageWidth - 2 * margin, boxHeight)
     .fillColor('#ffffff')
     .fill()
     .strokeColor('#dee2e6')
     .stroke();
  
  // Informații client
  let currentY = y + 40;
  doc.fontSize(12)
     .fillColor('#333333')
     .font('Helvetica-Bold')
     .text(removeDiacritics(offer.clientInfo.name), margin + 15, currentY);
  
  currentY += 15;
  if (offer.clientInfo.company) {
    doc.fontSize(11)
       .font('Helvetica')
       .text(removeDiacritics(offer.clientInfo.company), margin + 15, currentY);
    currentY += 13;
  }
  
  // Partea dreaptă - contact
  let rightY = y + 40;
  if (offer.clientInfo.email) {
    doc.fontSize(10)
       .text(`Email: ${offer.clientInfo.email}`, pageWidth - 250, rightY);
    rightY += 12;
  }
  
  if (offer.clientInfo.phone) {
    doc.text(`Telefon: ${offer.clientInfo.phone}`, pageWidth - 250, rightY);
    rightY += 12;
  }
  
  if (offer.clientInfo.address) {
    doc.text(`Adresa: ${removeDiacritics(offer.clientInfo.address)}`, margin + 15, currentY);
    currentY += 12;
  }
  
  if (offer.clientInfo.cui) {
    doc.text(`CUI: ${offer.clientInfo.cui}`, pageWidth - 250, rightY);
  }
}

async function addProductsTable(doc, offer) {
  const margin = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - 2 * margin;
  let currentY = 390;
  
  // Titlu secțiune
  doc.fontSize(16)
     .fillColor('#333333')
     .font('Helvetica-Bold')
     .text('PRODUSE SI SERVICII', margin, currentY);
  
  currentY += 30;
  
  // Header tabel
  const headerHeight = 30;
  doc.rect(margin, currentY, tableWidth, headerHeight)
     .fillColor('#d4af37')
     .fill();
  
  // Text header
  doc.fontSize(11)
     .fillColor('#ffffff')
     .font('Helvetica-Bold')
     .text('PRODUS', margin + 10, currentY + 10)
     .text('CANT.', margin + 250, currentY + 10)
     .text('PRET UNIT.', margin + 300, currentY + 10)
     .text('DISCOUNT', margin + 380, currentY + 10)
     .text('TOTAL', margin + 450, currentY + 10);
  
  currentY += headerHeight;
  
  // Produse
  for (let i = 0; i < offer.items.length; i++) {
    const item = offer.items[i];
    const rowHeight = 60; // Măresc înălțimea pentru URL-uri
    
    // Verifică dacă avem loc pe pagină
    if (currentY + rowHeight > doc.page.height - 100) {
      doc.addPage();
      currentY = 50;
    }
    
    // Background alternativ pentru rânduri
    if (i % 2 === 0) {
      doc.rect(margin, currentY, tableWidth, rowHeight)
         .fillColor('#f8f9fa')
         .fill();
    }
    
    // Border pentru rând
    doc.rect(margin, currentY, tableWidth, rowHeight)
       .strokeColor('#dee2e6')
       .stroke();
    
    // Încearcă să adaugi imaginea produsului (doar pentru produse normale)
    let imageAdded = false;
    if (!item.isCustomProduct && item.product && item.product.images && item.product.images.length > 0) {
      try {
        const imagePath = path.join(__dirname, '../../uploads', item.product.images[0]);
        if (fs.existsSync(imagePath)) {
          doc.image(imagePath, margin + 5, currentY + 5, { 
            width: 40, 
            height: 40 
          });
          imageAdded = true;
        }
      } catch (err) {
        console.log('Eroare la încărcarea imaginii:', err);
      }
    }
    
    // Text produs
    const textX = imageAdded ? margin + 55 : margin + 10;
    const productName = item.isCustomProduct 
      ? removeDiacritics(item.customProductName)
      : removeDiacritics(item.product.name);
    
    doc.fontSize(10)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text(productName, textX, currentY + 8, { 
         width: 200, // Măresc lățimea pentru nume mai lungi
         height: 15 
       });
    
    // Adaugă URL pentru produse normale (nu custom)
    if (!item.isCustomProduct && item.product) {
      // Generează slug dinamic dacă nu există
      const productSlug = item.product.slug || 
        item.product.name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Elimină caractere speciale
          .replace(/\s+/g, '-') // Înlocuiește spațiile cu -
          .replace(/-+/g, '-') // Elimină - consecutive
          .trim();
      
      const productUrl = `${COMPANY_INFO.website}/produs/${productSlug}`;
      doc.fontSize(7)
         .fillColor('#007bff')
         .font('Helvetica')
         .text(productUrl, textX, currentY + 24, { 
           width: 200, // Lățime optimizată pentru URL-uri
           height: 20,
           lineBreak: false // Nu împarte URL-ul pe mai multe linii
         });
    }
    
    // Descriere pentru produse custom
    if (item.isCustomProduct && item.customProductDescription) {
      doc.fontSize(8)
         .fillColor('#666666')
         .font('Helvetica')
         .text(removeDiacritics(item.customProductDescription), textX, currentY + 24, { 
           width: 200, 
           height: 20 
         });
    }
    
    // Cantitate
    doc.fontSize(10)
       .fillColor('#333333')
       .font('Helvetica')
       .text(item.quantity.toString(), margin + 250, currentY + 30);
    
    // Preț unitar
    doc.text(`${item.originalPrice.toFixed(2)} RON`, margin + 300, currentY + 30);
    
    // Discount
    let discountText = '-';
    if (item.discountPercentage > 0) {
      discountText = `${item.discountPercentage}%`;
    } else if (item.discountAmount > 0) {
      discountText = `${item.discountAmount.toFixed(2)} RON`;
    }
    
    if (discountText !== '-') {
      doc.fillColor('#dc3545')
         .text(discountText, margin + 380, currentY + 30);
    } else {
      doc.fillColor('#6c757d')
         .text(discountText, margin + 380, currentY + 30);
    }
    
    // Total
    doc.fontSize(11)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text(`${(item.finalPrice * item.quantity).toFixed(2)} RON`, margin + 450, currentY + 30);
    
    currentY += rowHeight;
  }
  
  return currentY;
}

function addTotals(doc, offer, startY) {
  const margin = 40;
  const pageWidth = doc.page.width;
  const boxWidth = 200;
  const boxX = pageWidth - margin - boxWidth;
  let currentY = startY + 30;
  
  // Box pentru totale
  const boxHeight = 100;
  doc.rect(boxX, currentY, boxWidth, boxHeight)
     .fillColor('#f8f9fa')
     .fill()
     .strokeColor('#dee2e6')
     .stroke();
  
  // Titlu
  doc.fontSize(12)
     .fillColor('#333333')
     .font('Helvetica-Bold')
     .text('REZUMAT PRETURI', boxX + 10, currentY + 10);
  
  currentY += 25;
  
  // Subtotal
  doc.fontSize(10)
     .font('Helvetica')
     .text('Subtotal:', boxX + 10, currentY)
     .font('Helvetica-Bold')
     .text(`${offer.subtotal.toFixed(2)} RON`, boxX + 110, currentY);
  
  currentY += 15;
  
  // Discount total (dacă există)
  if (offer.totalDiscount > 0) {
    doc.fillColor('#dc3545')
       .font('Helvetica')
       .text('Discount total:', boxX + 10, currentY)
       .font('Helvetica-Bold')
       .text(`-${offer.totalDiscount.toFixed(2)} RON`, boxX + 110, currentY);
    currentY += 15;
  }
  
  // Linie separator
  doc.moveTo(boxX + 10, currentY + 5)
     .lineTo(boxX + boxWidth - 10, currentY + 5)
     .strokeColor('#dee2e6')
     .stroke();
  
  currentY += 15;
  
  // Total final
  doc.fontSize(14)
     .fillColor('#d4af37')
     .font('Helvetica-Bold')
     .text('TOTAL:', boxX + 10, currentY)
     .text(`${offer.finalTotal.toFixed(2)} RON`, boxX + 70, currentY);
  
  return currentY + 30;
}

function addTermsAndConditions(doc, offer, startY) {
  const margin = 40;
  const pageWidth = doc.page.width;
  let currentY = startY + 40;
  
  // Verifică dacă avem conținut pentru această secțiune
  if (!offer.termsAndConditions && !offer.extraInfo) {
    return;
  }
  
  // Verifică dacă avem loc pe pagină
  if (currentY > doc.page.height - 200) {
    doc.addPage();
    currentY = 50;
  }
  
  if (offer.extraInfo) {
    doc.fontSize(14)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text('INFORMATII SUPLIMENTARE', margin, currentY);
    
    currentY += 20;
    
    doc.fontSize(10)
       .fillColor('#333333')
       .font('Helvetica')
       .text(removeDiacritics(offer.extraInfo), margin, currentY, { 
         width: pageWidth - 2 * margin,
         align: 'justify'
       });
    
    currentY = doc.y + 20;
  }
  
  if (offer.termsAndConditions) {
    // Verifică din nou dacă avem loc
    if (currentY > doc.page.height - 150) {
      doc.addPage();
      currentY = 50;
    }
    
    doc.fontSize(14)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text('TERMENI SI CONDITII', margin, currentY);
    
    currentY += 20;
    
    doc.fontSize(10)
       .fillColor('#333333')
       .font('Helvetica')
       .text(removeDiacritics(offer.termsAndConditions), margin, currentY, { 
         width: pageWidth - 2 * margin,
         align: 'justify'
       });
  }
}

function addFooter(doc, offer) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 40;
  const footerY = pageHeight - 80;
  
  // Linie separator
  doc.moveTo(margin, footerY)
     .lineTo(pageWidth - margin, footerY)
     .strokeColor('#dee2e6')
     .stroke();
  
  // Contact info și valabilitate
  doc.fontSize(9)
     .fillColor('#333333')
     .font('Helvetica-Bold')
     .text(removeDiacritics(COMPANY_INFO.contactMessage), margin, footerY + 10);
  
  doc.fontSize(8)
     .fillColor('#6c757d')
     .font('Helvetica')
     .text(`Tel: ${COMPANY_INFO.phones.join(' sau ')} | Email: ${COMPANY_INFO.email}`, margin, footerY + 24)
     .text(`Website: ${COMPANY_INFO.website}`, margin, footerY + 36);
  
  // Valabilitate în dreapta
  const validUntilDate = new Date(offer.validUntil).toLocaleDateString('ro-RO');
  doc.fontSize(9)
     .fillColor('#dc3545')
     .font('Helvetica-Bold')
     .text(`Oferta valabila pana la: ${validUntilDate}`, pageWidth - 200, footerY + 10);
  
  // Adresa completă
  doc.fontSize(7)
     .fillColor('#999999')
     .font('Helvetica')
     .text(removeDiacritics(COMPANY_INFO.address), margin, footerY + 48, {
       width: pageWidth - 2 * margin,
       align: 'center'
     });
}

function getStatusText(status) {
  const statusMap = {
    'draft': 'Ciorna',
    'sent': 'Trimisa',
    'accepted': 'Acceptata',
    'rejected': 'Respinsa',
    'expired': 'Expirata'
  };
  return statusMap[status] || status;
} 