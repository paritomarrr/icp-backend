// routes/icpWizard.js
const express = require('express');
const router = express.Router();
const { generateStepContent, generatePersonaDetails, generateSegmentDetails, generateProductDetails } = require('../services/groqService');
const auth = require('../middleware/auth');

// Generate suggestions for a specific step
router.post('/generate-suggestions', auth, async (req, res) => {
  try {
    const { currentStep, formData, companyName } = req.body;

    const result = await generateStepContent(currentStep, formData, companyName);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to generate suggestions',
        details: result.error 
      });
    }

    res.json({
      success: true,
      suggestions: result.suggestions
    });

  } catch (error) {
    console.error('Generate suggestions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Generate detailed persona information
router.post('/generate-persona-details', auth, async (req, res) => {
  try {
    const { personaTitle, companyData } = req.body;
    
    if (!personaTitle) {
      return res.status(400).json({
        success: false,
        error: 'Persona title is required'
      });
    }

    const result = await generatePersonaDetails(personaTitle, companyData || {});
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Generate persona details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Generate detailed segment information
router.post('/generate-segment-details', auth, async (req, res) => {
  try {
    const { segmentDescription, companyData } = req.body;
    
    if (!segmentDescription) {
      return res.status(400).json({
        success: false,
        error: 'Segment description is required'
      });
    }

    const result = await generateSegmentDetails(segmentDescription, companyData || {});
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Generate segment details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Generate detailed product information
router.post('/generate-product-details', auth, async (req, res) => {
  try {
    const { productName, companyData } = req.body;
    
    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required'
      });
    }

    const result = await generateProductDetails(productName, companyData || {});
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Generate product details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 