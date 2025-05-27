const ConsultationQuestion = require('../models/ConsultationQuestion');

// Get all consultation questions
exports.getQuestions = async (req, res) => {
  try {
    const questions = await ConsultationQuestion.find().sort({ ordine: 1 });
    res.json({ success: true, questions });
  } catch (error) {
    console.error('Error fetching consultation questions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single consultation question by ID
exports.getQuestionById = async (req, res) => {
  try {
    const question = await ConsultationQuestion.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    res.json({ success: true, question });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new consultation question
exports.createQuestion = async (req, res) => {
  try {
    const { text, tipRaspuns, pasConsultanta, optiuni, obligatoriu } = req.body;

    // Get the highest existing order value
    const maxOrderQuestion = await ConsultationQuestion.findOne().sort({ ordine: -1 });
    const nextOrdine = maxOrderQuestion ? maxOrderQuestion.ordine + 1 : 1;
    
    const newQuestion = new ConsultationQuestion({
      text,
      tipRaspuns,
      pasConsultanta,
      optiuni: optiuni || [],
      obligatoriu: obligatoriu || false,
      ordine: nextOrdine
    });

    await newQuestion.save();

    res.status(201).json({ success: true, question: newQuestion });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a consultation question
exports.updateQuestion = async (req, res) => {
  try {
    const { text, tipRaspuns, pasConsultanta, optiuni, obligatoriu, ordine } = req.body;

    const updatedQuestion = await ConsultationQuestion.findByIdAndUpdate(
      req.params.id, 
      { text, tipRaspuns, pasConsultanta, optiuni, obligatoriu, ordine },
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.json({ success: true, question: updatedQuestion });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a consultation question
exports.deleteQuestion = async (req, res) => {
  try {
    const deletedQuestion = await ConsultationQuestion.findByIdAndDelete(req.params.id);

    if (!deletedQuestion) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Update the order of remaining questions
    await ConsultationQuestion.updateMany(
      { ordine: { $gt: deletedQuestion.ordine } },
      { $inc: { ordine: -1 } }
    );

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}; 