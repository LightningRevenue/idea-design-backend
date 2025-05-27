const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  nume: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  telefon: {
    type: String,
    trim: true
  },
  tipProiect: {
    type: String,
    trim: true
  },
  suprafata: {
    type: Number
  },
  buget: {
    type: String,
    trim: true
  },
  stil: {
    type: String,
    trim: true
  },
  termen: {
    type: String,
    trim: true
  },
  descriere: {
    type: String,
    trim: true
  },
  // Storing answers to custom questions
  customResponses: {
    type: Map,
    of: mongoose.Schema.Types.Mixed // Can store strings or arrays of strings
  },
  status: {
    type: String,
    enum: ['nou', 'in_procesare', 'finalizat', 'anulat'],
    default: 'nou'
  }
}, {
  timestamps: true
});

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation; 