const Consultation = require('../models/Consultation');
const nodemailer = require('nodemailer');

// Submit a new consultation request
exports.submitConsultation = async (req, res) => {
  try {
    const { 
      nume, email, telefon, tipProiect, 
      suprafata, buget, stil, termen, 
      descriere, customResponses 
    } = req.body;

    // Validate required fields
    if (!nume || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Numele și emailul sunt obligatorii' 
      });
    }

    // Create new consultation
    const newConsultation = new Consultation({
      nume,
      email,
      telefon,
      tipProiect,
      suprafata: suprafata ? Number(suprafata) : undefined,
      buget,
      stil,
      termen,
      descriere,
      customResponses: customResponses || {}
    });

    // Save to database
    await newConsultation.save();

    // Send notification email (optional)
    try {
      // This would be implemented with actual email credentials
      // const transporter = nodemailer.createTransport({...});
      // await transporter.sendMail({...});
      console.log('Notification email would be sent here');
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't return an error, just log it
    }

    res.status(201).json({ 
      success: true, 
      message: 'Cererea de consultanță a fost trimisă cu succes',
      consultationId: newConsultation._id 
    });
  } catch (error) {
    console.error('Error submitting consultation:', error);
    res.status(500).json({ success: false, message: 'Eroare la trimiterea cererii' });
  }
};

// Get consultations by user email (for logged-in users)
exports.getUserConsultations = async (req, res) => {
  try {
    // The email comes from the currently logged in user
    const email = req.user ? req.user.email : null;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email utilizator necesar' 
      });
    }
    
    const consultations = await Consultation.find({ email })
      .sort({ createdAt: -1 }); // Newest first
      
    res.json({ 
      success: true, 
      consultations 
    });
  } catch (error) {
    console.error('Error fetching user consultations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la încărcarea consultațiilor' 
    });
  }
};

// Get all consultations (admin only)
exports.getConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find()
      .sort({ createdAt: -1 }); // Newest first
      
    res.json({ success: true, consultations });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single consultation by ID (admin only)
exports.getConsultationById = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }
    
    res.json({ success: true, consultation });
  } catch (error) {
    console.error('Error fetching consultation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update consultation status (admin only)
exports.updateConsultationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['nou', 'in_procesare', 'finalizat', 'anulat'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }
    
    const updatedConsultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!updatedConsultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }
    
    res.json({ success: true, consultation: updatedConsultation });
  } catch (error) {
    console.error('Error updating consultation status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a consultation (admin only)
exports.deleteConsultation = async (req, res) => {
  try {
    const deletedConsultation = await Consultation.findByIdAndDelete(req.params.id);
    
    if (!deletedConsultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }
    
    res.json({ success: true, message: 'Consultation deleted successfully' });
  } catch (error) {
    console.error('Error deleting consultation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}; 