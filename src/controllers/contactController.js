const ContactSubmission = require('../models/contactSubmission');

// Submit a contact form - public route
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    // Create new contact submission
    const contactSubmission = await ContactSubmission.create({
      name,
      email,
      phone,
      subject,
      message
    });
    
    res.status(201).json({
      success: true,
      message: 'Mesajul a fost trimis cu succes',
      data: {
        id: contactSubmission._id,
        name: contactSubmission.name
      }
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Eroare de validare',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Eroare la trimiterea formularului de contact',
      error: error.message
    });
  }
};

// Get all contact submissions - admin only
exports.getAllSubmissions = async (req, res) => {
  try {
    // Check pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Create filter object based on query parameters
    const filter = {};
    
    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filter by search term if provided (searches name, email, subject)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { subject: searchRegex }
      ];
    }
    
    // Get total count for pagination
    const total = await ContactSubmission.countDocuments(filter);
    
    // Get submissions with pagination
    const submissions = await ContactSubmission.find(filter)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: submissions.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea formularelor de contact',
      error: error.message
    });
  }
};

// Get a single submission by ID - admin only
exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Formularul de contact nu a fost găsit'
      });
    }
    
    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Error fetching contact submission:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea formularului de contact',
      error: error.message
    });
  }
};

// Update submission status - admin only
exports.updateSubmissionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const submission = await ContactSubmission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Formularul de contact nu a fost găsit'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Status actualizat cu succes',
      data: submission
    });
  } catch (error) {
    console.error('Error updating contact submission status:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea statusului formularului',
      error: error.message
    });
  }
};

// Delete a submission - admin only
exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Formularul de contact nu a fost găsit'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Formularul de contact a fost șters cu succes'
    });
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea formularului de contact',
      error: error.message
    });
  }
}; 