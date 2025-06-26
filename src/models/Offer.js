const mongoose = require('mongoose');

const offerItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: function() {
      return !this.isCustomProduct; // Required doar dacă nu e produs custom
    }
  },
  // Produse custom
  isCustomProduct: {
    type: Boolean,
    default: false
  },
  customProductName: {
    type: String,
    trim: true,
    required: function() {
      return this.isCustomProduct; // Required dacă e produs custom
    }
  },
  customProductDescription: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  originalPrice: {
    type: Number,
    required: true
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  finalPrice: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: false
});

const offerSchema = new mongoose.Schema({
  offerNumber: {
    type: String,
    required: true,
    unique: true
  },
  clientInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    cui: {
      type: String,
      trim: true
    }
  },
  items: [offerItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  globalDiscountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  globalDiscountAmount: {
    type: Number,
    default: 0
  },
  finalTotal: {
    type: Number,
    default: 0
  },
  validUntil: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    default: 'draft'
  },
  notes: {
    type: String,
    default: ''
  },
  extraInfo: {
    type: String,
    default: ''
  },
  termsAndConditions: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware pentru calcularea automată a prețurilor
offerSchema.pre('save', function(next) {
  // Asigură-te că există items
  if (!this.items || this.items.length === 0) {
    this.subtotal = 0;
    this.totalDiscount = 0;
    this.finalTotal = 0;
    this.lastModified = new Date();
    return next();
  }

  // Calculează prețul final pentru fiecare item PRIMUL
  this.items.forEach(item => {
    // Asigură-te că valorile sunt numerice și valide
    item.originalPrice = item.originalPrice || 0;
    item.quantity = item.quantity || 1;
    item.discountPercentage = item.discountPercentage || 0;
    item.discountAmount = item.discountAmount || 0;
    
    const itemDiscount = item.discountAmount + (item.originalPrice * item.discountPercentage / 100);
    item.finalPrice = Math.max(0, item.originalPrice - itemDiscount); // Nu poate fi negativ
  });

  // Calculează subtotalul
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.originalPrice * item.quantity);
  }, 0);

  // Calculează totalul înainte de discount-ul global
  const totalBeforeGlobalDiscount = this.items.reduce((sum, item) => {
    return sum + (item.finalPrice * item.quantity);
  }, 0);

  // Calculează discount-ul pe items
  const itemsDiscount = this.items.reduce((sum, item) => {
    return sum + ((item.discountAmount + (item.originalPrice * item.discountPercentage / 100)) * item.quantity);
  }, 0);

  // Aplică discount-ul global
  this.globalDiscountPercentage = this.globalDiscountPercentage || 0;
  this.globalDiscountAmount = this.globalDiscountAmount || 0;
  
  let globalDiscount = 0;
  if (this.globalDiscountPercentage > 0) {
    globalDiscount = totalBeforeGlobalDiscount * (this.globalDiscountPercentage / 100);
  }
  if (this.globalDiscountAmount > 0) {
    globalDiscount += this.globalDiscountAmount;
  }

  // Calculează totalul final
  this.finalTotal = Math.max(0, totalBeforeGlobalDiscount - globalDiscount); // Nu poate fi negativ
  this.totalDiscount = itemsDiscount + globalDiscount;

  // Actualizează data modificării
  this.lastModified = new Date();

  next();
});

// Metodă pentru generarea numărului de ofertă
offerSchema.statics.generateOfferNumber = async function() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Găsește ultima ofertă din luna curentă
  const lastOffer = await this.findOne({
    offerNumber: new RegExp(`^${year}${month}`)
  }).sort({ offerNumber: -1 });

  let nextNumber = 1;
  if (lastOffer) {
    const lastNumber = parseInt(lastOffer.offerNumber.slice(-4));
    nextNumber = lastNumber + 1;
  }

  return `${year}${month}${String(nextNumber).padStart(4, '0')}`;
};

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer; 