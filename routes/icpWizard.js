// routes/icpWizard.js
const express = require('express');
const router = express.Router();
const { generateStepContent, generatePersonaDetails, generateSegmentDetails, generateProductDetails } = require('../services/groqService');
const Workspace = require('../models/Workspace');
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

// Save enhanced ICP data to workspace
router.post('/enhanced-icp/:workspaceId', auth, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const enhancedICPData = req.body;

    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Check if user owns the workspace
    if (workspace.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this workspace'
      });
    }

    // Transform and save the enhanced ICP data
    const updateData = {
      domain: enhancedICPData.domain,
      adminAccess: enhancedICPData.adminAccess,
      socialProof: {
        caseStudies: (enhancedICPData.socialProof?.caseStudies || []).filter(study => 
          study && (study.url?.trim() || study.title?.trim() || study.description?.trim())
        ),
        testimonials: (enhancedICPData.socialProof?.testimonials || []).filter(testimonial => 
          testimonial && (testimonial.content?.trim() || testimonial.author?.trim())
        )
      },
      outboundExperience: {
        successfulEmails: (enhancedICPData.outboundExperience?.successfulEmails || []).filter(item => item && item.trim()),
        successfulCallScripts: (enhancedICPData.outboundExperience?.successfulCallScripts || []).filter(item => item && item.trim())
      },
      numberOfSegments: enhancedICPData.numberOfSegments
    };

    // Transform product data to match the enhanced schema
    if (enhancedICPData.product) {
      const productData = {
        name: workspace.companyName || 'Main Product',
        valueProposition: enhancedICPData.product.valueProposition,
        // Filter out empty strings from product arrays
        valuePropositionVariations: (enhancedICPData.product.valuePropositionVariations || []).filter(item => item && item.trim()),
        problemsWithRootCauses: (enhancedICPData.product.problemsWithRootCauses || []).filter(item => item && item.trim()),
        keyFeatures: (enhancedICPData.product.keyFeatures || []).filter(item => item && item.trim()),
        businessOutcomes: (enhancedICPData.product.businessOutcomes || []).filter(item => item && item.trim()),
        uniqueSellingPoints: (enhancedICPData.product.uniqueSellingPoints || []).filter(item => item && item.trim()),
        urgencyConsequences: (enhancedICPData.product.urgencyConsequences || []).filter(item => item && item.trim()),
        competitorAnalysis: (enhancedICPData.product.competitorAnalysis || []).filter(comp => 
          comp && (comp.domain?.trim() || comp.differentiation?.trim())
        ),
        pricingTiers: (enhancedICPData.offerSales?.pricingTiers || []).filter(item => item && item.trim()),
        clientTimeline: enhancedICPData.offerSales?.clientTimeline || '',
        roiRequirements: enhancedICPData.offerSales?.roiRequirements || '',
        salesDeckUrl: enhancedICPData.offerSales?.salesDeckUrl || ''
      };

      // Update or add the product
      if (workspace.products && workspace.products.length > 0) {
        workspace.products[0] = { ...workspace.products[0], ...productData };
      } else {
        workspace.products = [productData];
      }
    }

    // Update segments data with nested personas
    if (enhancedICPData.segments && enhancedICPData.segments.length > 0) {
      workspace.segments = enhancedICPData.segments.map(segment => ({
        ...segment,
        // Filter out empty strings from segment arrays
        locations: (segment.locations || []).filter(item => item && item.trim()),
        characteristics: (segment.characteristics || []).filter(item => item && item.trim()),
        industries: (segment.industries || []).filter(item => item && item.trim()),
        companySizes: (segment.companySizes || []).filter(item => item && item.trim()),
        technologies: (segment.technologies || []).filter(item => item && item.trim()),
        qualificationCriteria: (segment.qualificationCriteria || []).filter(item => item && item.trim()),
        signals: (segment.signals || []).filter(item => item && item.trim()),
        painPoints: (segment.painPoints || []).filter(item => item && item.trim()),
        buyingProcesses: (segment.buyingProcesses || []).filter(item => item && item.trim()),
        specificBenefits: (segment.specificBenefits || []).filter(item => item && item.trim()),
        ctaOptions: (segment.ctaOptions || []).filter(item => item && item.trim()),
        personas: segment.personas ? segment.personas.map(persona => ({
          // Map frontend fields to backend schema
          name: persona.title || persona.name || 'Unnamed Persona',
          title: persona.title,
          seniority: persona.seniority,
          // Filter out empty strings from persona arrays
          primaryResponsibilities: (persona.primaryResponsibilities || []).filter(item => item && item.trim()),
          challenges: (persona.challenges || []).filter(item => item && item.trim()),
          painPoints: (persona.challenges || []).filter(item => item && item.trim()), // Map challenges to painPoints as well
          jobTitles: (persona.jobTitles || []).filter(item => item && item.trim()),
          okrs: (persona.okrs || []).filter(item => item && item.trim()),
          goals: (persona.goals || []).filter(item => item && item.trim()),
          responsibilities: (persona.responsibilities || []).filter(item => item && item.trim()),
          channels: (persona.channels || []).filter(item => item && item.trim()),
          objections: (persona.objections || []).filter(item => item && item.trim()),
          triggers: (persona.triggers || []).filter(item => item && item.trim()),
          createdAt: new Date(),
          updatedAt: new Date(),
          // Include any other fields that might be present
          ...persona
        })).filter(persona => persona.name && persona.name.trim()) : [], // Filter out personas without names
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }

    // Apply all updates
    Object.assign(workspace, updateData);
    workspace.updatedAt = new Date();

    await workspace.save();

    res.json({
      success: true,
      message: 'Enhanced ICP data saved successfully',
      workspace: workspace
    });

  } catch (error) {
    console.error('Save enhanced ICP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
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