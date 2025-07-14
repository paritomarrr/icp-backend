const groqService = require('../services/groqService');

exports.getSuggestions = async (req, res) => {
  try {
    const { step, field, context } = req.body;
    // Use field as the main key for prompt selection
    const result = await groqService.generateStepContent(field, context, context?.admin?.domain || context?.companyDomain || "");
    if (result.success) {
      res.json({ suggestions: result.suggestions });
    } else {
      res.status(400).json({ error: result.error || 'Failed to generate suggestions' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 