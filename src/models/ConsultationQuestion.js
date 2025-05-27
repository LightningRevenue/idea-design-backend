const mongoose = require('mongoose');

const consultationQuestionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  tipRaspuns: {
    type: String,
    required: true,
    enum: ['text', 'single', 'multiple'],
    default: 'text'
  },
  pasConsultanta: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  optiuni: {
    type: [String],
    default: []
  },
  obligatoriu: {
    type: Boolean,
    default: false
  },
  ordine: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const ConsultationQuestion = mongoose.model('ConsultationQuestion', consultationQuestionSchema);

module.exports = ConsultationQuestion; 