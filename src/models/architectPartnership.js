const mongoose = require('mongoose');

const architectPartnershipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Numele este obligatoriu']
  },
  email: {
    type: String,
    required: [true, 'Email-ul este obligatoriu'],
    match: [/^\S+@\S+\.\S+$/, 'Adresa de email este invalidă']
  },
  phone: {
    type: String,
    required: [true, 'Telefonul este obligatoriu']
  },
  companyName: {
    type: String,
    required: [true, 'Numele companiei/studioului este obligatoriu']
  },
  website: {
    type: String
  },
  experience: {
    type: String
  },
  specialization: {
    type: String,
    required: [true, 'Specializarea este obligatorie']
  },
  projectTypes: {
    type: [String]
  },
  message: {
    type: String,
    required: [true, 'Mesajul este obligatoriu']
  },
  status: {
    type: String,
    enum: ['nou', 'în analiză', 'aprobat', 'respins'],
    default: 'nou'
  },
  adminNotes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update the 'updatedAt' field
architectPartnershipSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('ArchitectPartnership', architectPartnershipSchema); 