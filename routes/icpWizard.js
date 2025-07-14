// routes/icpWizard.js
const express = require('express');
const router = express.Router();
const { submitToAirtable, updateAirtableRecord } = require('../services/airtableService');
const { generateStepContent, generatePersonaDetails, generateSegmentDetails, generateProductDetails } = require('../services/claudeService');
const auth = require('../middleware/auth');

// Submit step data to Airtable and get suggestions for next step
router.post('/step', auth, async (req, res) => {
  try {
    const { stepData, currentStep, workspaceSlug, airtableRecordId } = req.body;
    const user = req.user;

    // Add workspace and user info to step data
    const enrichedStepData = {
      ...stepData,
      workspaceSlug,
      currentStep,
      companyName: stepData.companyName || user.companyName,
      userId: user.id
    };

    let airtableResult;
    if (airtableRecordId) {
      // Update existing record
      airtableResult = await updateAirtableRecord(airtableRecordId, enrichedStepData);
    } else {
      // Create new record
      airtableResult = await submitToAirtable(enrichedStepData);
    }
    if (!airtableResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to submit to Airtable',
        details: airtableResult.error 
      });
    }

    // Generate suggestions for next step if not the last step
    let suggestions = null;
    if (currentStep < 6) { // 6 steps total (0-5)
      const nextStep = currentStep + 1;
      const claudeResult = await generateStepContent(nextStep, stepData, enrichedStepData.companyName);
      
      if (claudeResult.success) {
        suggestions = claudeResult.suggestions;
      }
    }

    res.json({
      success: true,
      airtableRecordId: airtableResult.recordId,
      suggestions,
      nextStep: currentStep + 1
    });

  } catch (error) {
    console.error('ICP Wizard step error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Update existing Airtable record
router.put('/step/:recordId', auth, async (req, res) => {
  try {
    const { recordId } = req.params;
    const { stepData, currentStep, isComplete } = req.body;

    const updateResult = await updateAirtableRecord(recordId, {
      ...stepData,
      currentStep,
      isComplete
    });

    if (!updateResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update Airtable record',
        details: updateResult.error 
      });
    }

    res.json({
      success: true,
      recordId: updateResult.recordId
    });

  } catch (error) {
    console.error('ICP Wizard update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

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