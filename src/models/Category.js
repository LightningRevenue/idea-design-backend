const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Numele categoriei este obligatoriu'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Descrierea categoriei este obligatorie'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Imaginea categoriei este obligatorie']
  },
  icon: {
    type: String,
    default: ''
  },
  showInNavbar: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  productCount: {
    type: Number,
    default: 0
  },
  // Câmpuri noi pentru secțiunile custom de descriere
  customSections: [{
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  // Titlu custom pentru secțiunea de descriere (opțional)
  descriptionTitle: {
    type: String,
    default: 'Despre produsele din această categorie'
  },
  // Subtitlu custom pentru secțiunea de descriere (opțional)  
  descriptionSubtitle: {
    type: String,
    default: ''
  },
  // Cuvinte cheie SEO pentru afișare în footer-ul paginii de categorie
  seoKeywords: {
    type: [String],
    default: [],
    validate: {
      validator: function(keywords) {
        return keywords.length <= 50; // Maxim 50 de keywords
      },
      message: 'Prea multe cuvinte cheie. Maxim 50 permise.'
    }
  }
}, {
  timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 