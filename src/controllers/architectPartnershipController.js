const ArchitectPartnership = require('../models/architectPartnership');

// Get all architect partnership applications (admin only)
exports.getAllApplications = async (req, res) => {
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
    
    // Filter by search term if provided (searches name, email, company name)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { companyName: searchRegex }
      ];
    }
    
    // Get total count for pagination
    const total = await ArchitectPartnership.countDocuments(filter);
    
    // Get applications with pagination
    const applications = await ArchitectPartnership.find(filter)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: applications.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching architect partnership applications:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea cererilor de parteneriat',
      error: error.message
    });
  }
};

// Get application by ID (admin only)
exports.getApplicationById = async (req, res) => {
  try {
    const application = await ArchitectPartnership.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Cererea de parteneriat nu a fost găsită'
      });
    }
    
    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching architect partnership application:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea cererii de parteneriat',
      error: error.message
    });
  }
};

// Create new application (public)
exports.createApplication = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      companyName,
      website,
      experience,
      specialization,
      projectTypes,
      message
    } = req.body;
    
    // Create new application
    const application = await ArchitectPartnership.create({
      name,
      email,
      phone,
      companyName,
      website,
      experience,
      specialization,
      projectTypes,
      message
    });
    
    res.status(201).json({
      success: true,
      message: 'Cererea de parteneriat a fost trimisă cu succes',
      data: application
    });
  } catch (error) {
    console.error('Error creating architect partnership application:', error);
    
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
      message: 'Eroare la trimiterea cererii de parteneriat',
      error: error.message
    });
  }
};

// Update application status (admin only)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    // Find application and update
    const application = await ArchitectPartnership.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        adminNotes: adminNotes || '',
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Cererea de parteneriat nu a fost găsită'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Status actualizat cu succes',
      data: application
    });
  } catch (error) {
    console.error('Error updating architect partnership application:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea statusului cererii',
      error: error.message
    });
  }
};

// Delete application (admin only)
exports.deleteApplication = async (req, res) => {
  try {
    const application = await ArchitectPartnership.findByIdAndDelete(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Cererea de parteneriat nu a fost găsită'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Cererea de parteneriat a fost ștearsă cu succes'
    });
  } catch (error) {
    console.error('Error deleting architect partnership application:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea cererii de parteneriat',
      error: error.message
    });
  }
}; 