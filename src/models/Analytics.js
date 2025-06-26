const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'popup_view',           // Popup-ul a fost afișat
      'popup_click',          // Click pe butoane din popup (vezi oferte)
      'popup_close',          // Popup închis (X, overlay, continue)
      'page_view',            // Vizualizare pagină generală
      'offers_page_view',     // Vizualizare pagina de oferte
      'product_click',        // Click pe produs
      'product_view',         // Vizualizare pagina produs
      'add_to_cart',          // Adăugare în coș
      'category_view',        // Vizualizare pagina categorie
      'category_filter',      // Click pe filtru de categorie
      'homepage_view',        // Vizualizare homepage
      'search_query'          // Căutare
    ]
  },
  
  // Date despre eveniment
  eventData: {
    // Popup events
    popup_type: String,          // Tipul de popup (june_offers, etc.)
    page: String,                // Pagina de pe care vine (homepage, etc.)
    action: String,              // Acțiunea (view_offers, etc.)
    close_method: String,        // Metoda de închidere (close_button, overlay_click, continue_button)
    
    // Product events
    product_id: String,          // ID-ul produsului
    productId: String,           // Pentru compatibilitate
    product_name: String,        // Numele produsului
    productName: String,         // Pentru compatibilitate
    product_price: Number,       // Prețul produsului
    original_price: Number,      // Prețul original (înainte de reducere)
    discount_percentage: Number, // Procentul de reducere
    click_source: String,        // Sursa click-ului (quick_view_overlay, details_button)
    
    // Category/page events
    page_title: String,          // Titlul paginii
    category_name: String,       // Numele categoriei
    categoryName: String,        // Pentru compatibilitate
    
    // Search events
    searchQuery: String,         // Pentru căutări
    
    // General
    source: String,              // De unde a venit (homepage_popup, category_page, etc.)
    pageUrl: String,             // URL-ul paginii
    referrer: String,            // De unde a venit utilizatorul
    timestamp: String            // Timestamp-ul evenimentului
  },
  
  // Date despre utilizator/sesiune
  userAgent: String,
  ipAddress: String,
  sessionId: String,             // ID sesiune pentru grupare
  userId: String,                // ID utilizator dacă e logat
  guestId: String,               // ID guest pentru tracking anonim
  
  // Date despre dispozitiv
  deviceInfo: {
    isMobile: Boolean,
    isTablet: Boolean,
    isDesktop: Boolean,
    browser: String,
    os: String
  },
  
  // Metadata
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexuri pentru performanță
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ 'eventData.productId': 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1, timestamp: -1 });
analyticsSchema.index({ timestamp: -1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics; 