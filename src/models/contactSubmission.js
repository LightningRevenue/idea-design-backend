const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
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
    type: String
  },
  subject: {
    type: String,
    default: 'Formular de contact'
  },
  message: {
    type: String,
    required: [true, 'Mesajul este obligatoriu']
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'completed'],
    default: 'new'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema); 