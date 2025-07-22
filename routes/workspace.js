const express = require("express");
const Workspace = require("../models/Workspace");
const auth = require("../middleware/auth");
const router = express.Router();
const { callClaudeForICP, generateProductDetails, generatePersonaDetails, generateSegmentDetails, refineUserInput, refineComplexObject } = require('../services/groqService');
const slugify = require('slugify');
const { addCollaborator, getCollaborators, removeCollaborator } = require("../controllers/workspaceController");

// Helper function to safely filter string arrays
const filterStringArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.filter(item => item && typeof item === 'string' && item.trim());
};

// Helper function to check if user has access to workspace (owner or collaborator)
const hasWorkspaceAccess = (workspace, userId) => {
  return workspace.ownerId.toString() === userId || 
         workspace.collaborators.some(collaboratorId => collaboratorId.toString() === userId);
};

// Create a new workspace
router.post("/", auth, async (req, res) => {
  const { name, companyName, companyUrl } = req.body;

  if (!name || !companyName || !companyUrl ) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;

    // Ensure slug is unique by incrementing a number if needed
    let count = 1;
    while (await Workspace.findOne({ slug })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    const workspace = await Workspace.create({
      name,
      companyName,
      companyUrl,
      slug,
      ownerId: req.user.userId,
    });

    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ error: "Workspace creation failed", details: err.message });
  }
});

// Update ICP data for a workspace by slug
router.put('/:slug/icp', auth, async (req, res) => {
    try { 
      const slug = req.params.slug;
      const { 
        companyUrl, 
        products,
        personas,
        useCases,
        differentiation,
        segments,
        competitors,
      } = req.body;
  
      // Validate required fields
      if (
        typeof companyUrl !== 'string' ||
        !Array.isArray(products) || products.length === 0 ||
        !Array.isArray(personas) || personas.length === 0 ||
        !Array.isArray(useCases) || useCases.length === 0 ||
        !Array.isArray(segments) || segments.length === 0 ||
        typeof differentiation !== 'string' ||
        !Array.isArray(competitors) ||
        competitors.some(c => typeof c.name !== 'string' || typeof c.url !== 'string')
      ) {
        return res.status(400).json({ error: "Missing or invalid ICP fields" });
      }
  
      const workspace = await Workspace.findOne({ slug });
  
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Check if user has access to this workspace
      if (!hasWorkspaceAccess(workspace, req.user.userId)) {
        return res.status(403).json({ error: "You do not have access to this workspace" });
      }
  
      // Convert simple arrays to detailed objects if needed
      const convertToDetailedProducts = async (productNames) => {
        const detailedProducts = [];
        
        for (const name of productNames) {
          // Create base product object
          const product = {
            name: name,
            description: '',
            category: '',
            targetAudience: '',
            valueProposition: '',
            problems: [],
            features: [],
            benefits: [],
            useCases: [],
            competitors: [],
            uniqueSellingPoints: [],
            usps: [],
            solution: '',
            whyNow: [],
            pricing: '',
            status: 'active',
            priority: 'medium',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Enrich with Claude data
          try {
            const companyData = {
              companyName: workspace.companyName,
              companyUrl: workspace.companyUrl,
              products: productNames
            };
            
            const enrichmentResult = await generateProductDetails(name, companyData);
            if (enrichmentResult.success && enrichmentResult.data) {
              const enrichedData = enrichmentResult.data;
              
              // Update product with enriched data
              product.description = enrichedData.description || product.description;
              product.problems = enrichedData.problems || product.problems;
              product.features = enrichedData.features || product.features;
              product.benefits = enrichedData.benefits || product.benefits;
              product.useCases = enrichedData.useCases || product.useCases;
              product.usps = enrichedData.usps || product.usps;
              product.solution = enrichedData.solution || product.solution;
              product.whyNow = enrichedData.whyNow || product.whyNow;
              product.uniqueSellingPoints = enrichedData.usps || product.uniqueSellingPoints;
            }
          } catch (error) {
            console.error(`Failed to enrich product ${name}:`, error);
          }

          detailedProducts.push(product);
        }
        
        return detailedProducts;
      };

      const convertToDetailedPersonas = async (personaNames) => {
        const detailedPersonas = [];
        
        for (const name of personaNames) {
          // Create base persona object
          const persona = {
            name: name,
            title: '',
            department: '',
            seniority: '',
            industry: '',
            company: '',
            location: '',
            description: '',
            painPoints: [],
            goals: [],
            responsibilities: [],
            challenges: [],
            decisionInfluence: 'Decision Maker',
            budget: '',
            teamSize: '',
            channels: [],
            objections: [],
            contactInfo: {
              email: '',
              phone: '',
              linkedin: '',
              location: ''
            },
            demographics: {
              age: '',
              experience: '',
              education: '',
              industry: ''
            },
            buyingBehavior: {
              researchTime: '',
              decisionFactors: [],
              preferredChannels: []
            },
            status: 'active',
            priority: 'medium',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Enrich with Claude data
          try {
            const companyData = {
              companyName: workspace.companyName,
              companyUrl: workspace.companyUrl,
              products: workspace.products ? workspace.products.map(p => p.name) : []
            };
            
            const enrichmentResult = await generatePersonaDetails(name, companyData);
            if (enrichmentResult.success && enrichmentResult.data) {
              const enrichedData = enrichmentResult.data;
              persona.painPoints = enrichedData.painPoints || persona.painPoints;
              persona.goals = enrichedData.goals || persona.goals;
              persona.responsibilities = enrichedData.responsibilities || persona.responsibilities;
              persona.challenges = enrichedData.challenges || persona.challenges;
              persona.channels = enrichedData.channels || persona.channels;
              persona.objections = enrichedData.objections || persona.objections;
            }
          } catch (error) {
            console.error(`Failed to enrich persona ${name}:`, error);
          }

          detailedPersonas.push(persona);
        }
        
        return detailedPersonas;
      };

      const convertToDetailedSegments = async (segmentNames) => {
        const detailedSegments = [];
        
        for (const name of segmentNames) {
          // Create base segment object
          const segment = {
            name: name,
            description: '',
            size: '',
            region: '',
            budget: '',
            focus: '',
            industry: '',
            companySize: '',
            revenue: '',
            geography: '',
            employees: '',
            marketSize: '',
            growthRate: '',
            customerCount: '',
            competitiveIntensity: '',
            characteristics: [],
            industries: [],
            companySizes: [],
            technologies: [],
            qualificationCriteria: [],
            painPoints: [],
            buyingProcesses: [],
            firmographics: [],
            benefits: '',
            awarenessLevel: ['Solution Aware'],
            priority: 'medium',
            status: 'active',
            qualification: {
              idealCriteria: [],
              lookalikeCompanies: [],
              disqualifyingCriteria: []
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Enrich with Claude data
          try {
            const companyData = {
              companyName: workspace.companyName,
              companyUrl: workspace.companyUrl,
              products: workspace.products ? workspace.products.map(p => p.name) : []
            };
            
            const enrichmentResult = await generateSegmentDetails(name, companyData);
            if (enrichmentResult.success && enrichmentResult.data) {
              const enrichedData = enrichmentResult.data;
              
              // Update segment with enriched data
              segment.description = enrichedData.description || segment.description;
              segment.characteristics = enrichedData.characteristics || segment.characteristics;
              segment.painPoints = enrichedData.painPoints || segment.painPoints;
              segment.marketSize = enrichedData.marketSize || segment.marketSize;
              segment.growthRate = enrichedData.growthRate || segment.growthRate;
              segment.benefits = enrichedData.benefits || segment.benefits;
              
              if (enrichedData.qualification) {
                segment.qualification = {
                  ...segment.qualification,
                  ...enrichedData.qualification
                };
              }
              
              if (enrichedData.buyingBehavior) {
                segment.buyingProcesses = enrichedData.buyingBehavior.decisionMakers || segment.buyingProcesses;
              }
            }
          } catch (error) {
            console.error(`Failed to enrich segment ${name}:`, error);
          }

          detailedSegments.push(segment);
        }
        
        return detailedSegments;
      };

      // Refine user input before processing
      const context = {
        companyName: workspace.companyName,
        domain: companyUrl
      };

      // Refine differentiation statement
      const refinedDifferentiation = differentiation ? 
        await refineUserInput('differentiation', differentiation, context) : 
        { success: true, data: differentiation };

      // Refine use cases
      const refinedUseCases = useCases && useCases.length > 0 ? 
        await refineUserInput('batchTextArray', useCases, { ...context, itemType: 'useCases' }) : 
        { success: true, data: useCases };

      // Update fields - convert simple arrays to detailed objects with enrichment
      workspace.companyUrl = companyUrl;
      workspace.products = await convertToDetailedProducts(products);
      workspace.useCases = refinedUseCases.success ? refinedUseCases.data : useCases;
      workspace.differentiation = refinedDifferentiation.success ? refinedDifferentiation.data : differentiation;
      workspace.segments = await convertToDetailedSegments(segments);
      workspace.competitors = competitors;

      // Convert personas to nested structure within segments
      if (personas && personas.length > 0) {
        const detailedPersonas = await convertToDetailedPersonas(personas);
        
        // Distribute personas across segments
        // For now, put all personas in the first segment if no specific assignment
        if (workspace.segments.length > 0) {
          workspace.segments[0].personas = detailedPersonas;
        }
      }
  
      await workspace.save();
  
      // Optionally trigger Groq enrichment after saving ICP
      try {
        // Extract all personas from segments for enrichment
        const allPersonas = [];
        workspace.segments.forEach(segment => {
          if (segment.personas && segment.personas.length > 0) {
            allPersonas.push(...segment.personas);
          }
        });

        const enrichment = await callClaudeForICP({
          companyName: workspace.companyName,
          companyUrl: workspace.companyUrl,
          products: workspace.products,
          personas: allPersonas,
          useCases: workspace.useCases,
          differentiation: workspace.differentiation,
          segments: workspace.segments,
          competitors: workspace.competitors,
        });
  
        workspace.icpEnrichmentVersions = enrichment;
        await workspace.save();
      } catch (err) {
        // Claude enrichment failed, but continue
      }
  
      res.status(200).json(workspace);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update ICP' });
    }
  });
  
// Re-enrich ICP data for a workspace by slug
router.post('/:slug/icp/re-enrich', auth, async (req, res) => {
    try {
      const workspace = await Workspace.findOne({ slug: req.params.slug });
      if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

      // Check if user has access to this workspace
      if (!hasWorkspaceAccess(workspace, req.user.userId)) {
        return res.status(403).json({ error: "You do not have access to this workspace" });
      }

      const variants = await callClaudeForICP(workspace);
      workspace.icpEnrichmentVersions = variants;
      await workspace.save();

      res.status(200).json({ message: 'Re-enriched successfully', data: variants });
    } catch (err) {
      res.status(500).json({ error: 'Failed to re-enrich' });
    }
  });
  
// Get all workspaces for the current user
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Find workspaces where user is owner, creator, or collaborator
    const workspaces = await Workspace.find({
      $or: [
        { ownerId: userId },
        { creatorId: userId },
        { collaborators: userId }
      ]
    });


    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workspaces", details: err.message });
  }
});

// Get a workspace by slug
router.get("/slug/:slug", auth, async (req, res) => {
    try {
      const { slug } = req.params;
  
      const workspace = await Workspace.findOne({ slug });
  
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!hasWorkspaceAccess(workspace, req.user.userId)) {
        return res.status(403).json({ error: "You do not have access to this workspace" });
      }
  
      return res.status(200).json(workspace);
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

// Delete a workspace by ID
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find the workspace by ID
    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Only the owner can delete the workspace
    if (workspace.ownerId.toString() !== userId) {
      return res.status(403).json({ error: "Only workspace owner can delete the workspace" });
    }

    // Delete the workspace
    await Workspace.findByIdAndDelete(id);

    res.status(200).json({ message: "Workspace deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete workspace" });
  }
});

// ==================== PRODUCT ROUTES ====================

// Add a new product to workspace
router.post('/:slug/products', auth, async (req, res) => {
  try {
    const { slug } = req.params;
    const productData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    // Refine user input before saving
    const context = {
      companyName: workspace.companyName,
      domain: workspace.companyUrl,
      companyType: workspace.companyType
    };

    const refinedProduct = await refineComplexObject('product', productData, context);
    const finalProductData = refinedProduct.success ? refinedProduct.data : productData;

    // Add timestamps
    finalProductData.createdAt = new Date();
    finalProductData.updatedAt = new Date();

    workspace.products.push(finalProductData);
    await workspace.save();

    res.status(201).json({ 
      success: true, 
      product: workspace.products[workspace.products.length - 1] 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product', details: error.message });
  }
});

// Update a product
router.put('/:slug/products/:productId', auth, async (req, res) => {
  try {
    const { slug, productId } = req.params;
    const updateData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    const product = workspace.products.id(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Refine user input before updating
    const context = {
      companyName: workspace.companyName,
      domain: workspace.companyUrl,
      companyType: workspace.companyType,
      productName: product.name
    };

    const refinedUpdate = await refineComplexObject('product', updateData, context);
    const finalUpdateData = refinedUpdate.success ? refinedUpdate.data : updateData;

    // Update fields
    Object.assign(product, finalUpdateData, { updatedAt: new Date() });
    await workspace.save();

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// Delete a product
router.delete('/:slug/products/:productId', auth, async (req, res) => {
  try {
    const { slug, productId } = req.params;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    workspace.products.id(productId).remove();
    await workspace.save();

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
});

// ==================== PERSONA ROUTES ====================

// Add a new persona to a specific segment
router.post('/:slug/segments/:segmentId/personas', auth, async (req, res) => {
  try {
    const { slug, segmentId } = req.params;
    const personaData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    const segment = workspace.segments.id(segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    // Refine user input before saving
    const context = {
      companyName: workspace.companyName,
      domain: workspace.companyUrl,
      industry: segment.industry,
      companySize: segment.companySize,
      segmentName: segment.name
    };

    const refinedPersona = await refineComplexObject('persona', personaData, context);
    const finalPersonaData = refinedPersona.success ? refinedPersona.data : personaData;

    // Add timestamps
    finalPersonaData.createdAt = new Date();
    finalPersonaData.updatedAt = new Date();

    if (!segment.personas) {
      segment.personas = [];
    }
    segment.personas.push(finalPersonaData);
    await workspace.save();

    res.status(201).json({ 
      success: true, 
      persona: segment.personas[segment.personas.length - 1] 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add persona', details: error.message });
  }
});

// Get all personas from all segments (for backward compatibility)
router.get('/:slug/personas', auth, async (req, res) => {
  try {
    const { slug } = req.params;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    // Collect all personas from all segments
    const allPersonas = [];
    workspace.segments.forEach(segment => {
      if (segment.personas && segment.personas.length > 0) {
        segment.personas.forEach(persona => {
          allPersonas.push({
            ...persona.toObject(),
            segmentId: segment._id,
            segmentName: segment.name
          });
        });
      }
    });

    res.json({ success: true, personas: allPersonas });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get personas', details: error.message });
  }
});

// Update a persona within a segment
router.put('/:slug/segments/:segmentId/personas/:personaId', auth, async (req, res) => {
  try {
    const { slug, segmentId, personaId } = req.params;
    const updateData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    const segment = workspace.segments.id(segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const persona = segment.personas.id(personaId);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // Refine user input before updating
    const context = {
      companyName: workspace.companyName,
      domain: workspace.companyUrl,
      industry: segment.industry,
      companySize: segment.companySize,
      segmentName: segment.name,
      personaTitle: persona.title || persona.name
    };

    const refinedUpdate = await refineComplexObject('persona', updateData, context);
    const finalUpdateData = refinedUpdate.success ? refinedUpdate.data : updateData;

    // Update fields
    Object.assign(persona, finalUpdateData, { updatedAt: new Date() });
    await workspace.save();

    res.json({ success: true, persona });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update persona', details: error.message });
  }
});

// Delete a persona from a segment
router.delete('/:slug/segments/:segmentId/personas/:personaId', auth, async (req, res) => {
  try {
    const { slug, segmentId, personaId } = req.params;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    const segment = workspace.segments.id(segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    segment.personas.id(personaId).remove();
    await workspace.save();

    res.json({ success: true, message: 'Persona deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete persona', details: error.message });
  }
});

// ==================== SEGMENT ROUTES ====================

// Add a new segment to workspace
router.post('/:slug/segments', auth, async (req, res) => {
  try {
    const { slug } = req.params;
    const segmentData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    // Refine user input before saving
    const context = {
      companyName: workspace.companyName,
      domain: workspace.companyUrl,
      industry: segmentData.industry
    };

    const refinedSegment = await refineComplexObject('segment', segmentData, context);
    const finalSegmentData = refinedSegment.success ? refinedSegment.data : segmentData;

    // Add timestamps
    finalSegmentData.createdAt = new Date();
    finalSegmentData.updatedAt = new Date();

    workspace.segments.push(finalSegmentData);
    await workspace.save();

    res.status(201).json({ 
      success: true, 
      segment: workspace.segments[workspace.segments.length - 1] 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add segment', details: error.message });
  }
});

// Update a segment
router.put('/:slug/segments/:segmentId', auth, async (req, res) => {
  try {
    const { slug, segmentId } = req.params;
    const updateData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    const segment = workspace.segments.id(segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    // Refine user input before updating
    const context = {
      companyName: workspace.companyName,
      domain: workspace.companyUrl,
      industry: segment.industry || updateData.industry,
      segmentName: segment.name
    };

    const refinedUpdate = await refineComplexObject('segment', updateData, context);
    const finalUpdateData = refinedUpdate.success ? refinedUpdate.data : updateData;

    // Update fields
    Object.assign(segment, finalUpdateData, { updatedAt: new Date() });
    await workspace.save();

    res.json({ success: true, segment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update segment', details: error.message });
  }
});

// Delete a segment
router.delete('/:slug/segments/:segmentId', auth, async (req, res) => {
  try {
    const { slug, segmentId } = req.params;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    workspace.segments.id(segmentId).remove();
    await workspace.save();

    res.json({ success: true, message: 'Segment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete segment', details: error.message });
  }
});

// Save enhanced ICP data to workspace
router.post('/:workspaceId/enhanced-icp', auth, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const enhancedICPData = req.body;

    // Debug logging
    console.log("=== BACKEND ENHANCED ICP DEBUG ===");
    console.log("Received data keys:", Object.keys(enhancedICPData));
    console.log("Domain:", enhancedICPData.domain);
    console.log("Product valueProposition:", enhancedICPData.product?.valueProposition);
    console.log("OfferSales data:", enhancedICPData.offerSales);
    console.log("AdminAccess data:", enhancedICPData.adminAccess);
    console.log("================================");

    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, req.user.userId)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this workspace'
      });
    }

    // Enhance ALL user responses using Groq before saving
    const context = {
      companyName: workspace.companyName,
      domain: enhancedICPData.domain,
      productName: workspace.products?.[0]?.name
    };

    // Helper function to safely refine text
    const safeRefine = async (type, text, ctx = {}) => {
      if (!text || (Array.isArray(text) && text.length === 0)) {
        return { success: true, data: Array.isArray(text) ? [] : '' };
      }
      try {
        return await refineUserInput(type, text, { ...context, ...ctx });
      } catch (error) {
        console.warn(`Refinement failed for ${type}:`, error);
        return { success: true, data: text };
      }
    };

    // Refine Product fields
    const refinedValueProp = await safeRefine('valueProposition', enhancedICPData.product?.valueProposition);
    const refinedDescription = await safeRefine('productDescription', enhancedICPData.product?.description);
    const refinedCategory = await safeRefine('productName', enhancedICPData.product?.category);
    
    // Refine Product arrays
    const refinedValuePropVariations = await safeRefine('batchTextArray', enhancedICPData.product?.valuePropositionVariations, { itemType: 'valuePropositionVariations' });
    const refinedProblems = await safeRefine('batchTextArray', enhancedICPData.product?.problemsWithRootCauses, { itemType: 'problemsWithRootCauses' });
    const refinedFeatures = await safeRefine('batchTextArray', enhancedICPData.product?.keyFeatures, { itemType: 'keyFeatures' });
    const refinedUSPs = await safeRefine('batchTextArray', enhancedICPData.product?.uniqueSellingPoints, { itemType: 'uniqueSellingPoints' });
    const refinedBusinessOutcomes = await safeRefine('batchTextArray', enhancedICPData.product?.businessOutcomes, { itemType: 'businessOutcomes' });
    const refinedUrgencyConsequences = await safeRefine('batchTextArray', enhancedICPData.product?.urgencyConsequences, { itemType: 'urgencyConsequences' });
    const refinedUseCases = await safeRefine('batchTextArray', enhancedICPData.product?.useCases, { itemType: 'useCases' });

    // Refine OfferSales arrays
    const refinedPricingTiers = await safeRefine('batchTextArray', enhancedICPData.offerSales?.pricingTiers, { itemType: 'pricingTiers' });
    const refinedClientTimeline = await safeRefine('batchTextArray', enhancedICPData.offerSales?.clientTimeline, { itemType: 'clientTimeline' });
    const refinedRoiRequirements = await safeRefine('batchTextArray', enhancedICPData.offerSales?.roiRequirements, { itemType: 'roiRequirements' });

    // Refine OutboundExperience arrays
    const refinedSuccessfulEmails = await safeRefine('batchTextArray', enhancedICPData.outboundExperience?.successfulEmails, { itemType: 'successfulEmails' });
    const refinedSuccessfulCallScripts = await safeRefine('batchTextArray', enhancedICPData.outboundExperience?.successfulCallScripts, { itemType: 'successfulCallScripts' });

    // Refine CompetitorAnalysis
    const refinedCompetitorAnalysis = enhancedICPData.product?.competitorAnalysis?.length > 0 ?
      await Promise.all(enhancedICPData.product.competitorAnalysis.map(async (comp) => {
        if (!comp || (!comp.domain?.trim() && !comp.differentiation?.trim())) return comp;
        
        const refinedDiff = comp.differentiation?.trim() ? 
          await safeRefine('differentiation', comp.differentiation, { companyName: comp.domain }) : 
          { success: true, data: comp.differentiation || '' };
        
        return {
          domain: comp.domain || '',
          differentiation: refinedDiff.success ? refinedDiff.data : comp.differentiation || ''
        };
      })) : [];

    // Refine SocialProof
    const refinedCaseStudies = enhancedICPData.socialProof?.caseStudies?.length > 0 ?
      await Promise.all(enhancedICPData.socialProof.caseStudies.map(async (study) => {
        if (!study || (!study.title?.trim() && !study.description?.trim())) return study;
        
        const refinedTitle = study.title?.trim() ? 
          await safeRefine('productName', study.title) : 
          { success: true, data: study.title || '' };
        
        const refinedDesc = study.description?.trim() ? 
          await safeRefine('caseStudy', study.description) : 
          { success: true, data: study.description || '' };
        
        return {
          url: study.url || '',
          title: refinedTitle.success ? refinedTitle.data : study.title || '',
          description: refinedDesc.success ? refinedDesc.data : study.description || ''
        };
      })) : [];

    const refinedTestimonials = enhancedICPData.socialProof?.testimonials?.length > 0 ?
      await Promise.all(enhancedICPData.socialProof.testimonials.map(async (testimonial) => {
        if (!testimonial || (!testimonial.content?.trim() && !testimonial.author?.trim())) return testimonial;
        
        const refinedContent = testimonial.content?.trim() ? 
          await safeRefine('testimonial', testimonial.content) : 
          { success: true, data: testimonial.content || '' };
        
        const refinedAuthor = testimonial.author?.trim() ? 
          await safeRefine('personaName', testimonial.author) : 
          { success: true, data: testimonial.author || '' };
        
        return {
          content: refinedContent.success ? refinedContent.data : testimonial.content || '',
          author: refinedAuthor.success ? refinedAuthor.data : testimonial.author || ''
        };
      })) : [];

    // Helper function to refine persona data
    const refinePersona = async (persona, segmentContext = {}) => {
      const personaContext = { ...context, ...segmentContext, personaTitle: Array.isArray(persona.title) ? persona.title[0] : persona.title };
      
      const refinedTitle = Array.isArray(persona.title) && persona.title.length > 0 ?
        await safeRefine('batchTextArray', persona.title, { itemType: 'personaTitle' }) :
        { success: true, data: [] };
      
      const refinedDepartment = Array.isArray(persona.department) && persona.department.length > 0 ?
        await safeRefine('batchTextArray', persona.department, { itemType: 'personaDepartment' }) :
        { success: true, data: [] };
      
      const refinedResponsibilities = Array.isArray(persona.primaryResponsibilities) && persona.primaryResponsibilities.length > 0 ?
        await safeRefine('batchTextArray', persona.primaryResponsibilities, { itemType: 'personaResponsibilities' }) :
        { success: true, data: [] };
      
      const refinedOkrs = Array.isArray(persona.okrs) && persona.okrs.length > 0 ?
        await safeRefine('batchTextArray', persona.okrs, { itemType: 'personaOKRs' }) :
        { success: true, data: [] };
      
      const refinedChallenges = Array.isArray(persona.challenges) && persona.challenges.length > 0 ?
        await safeRefine('batchTextArray', persona.challenges, { itemType: 'personaChallenges' }) :
        { success: true, data: [] };
      
      const refinedPainPoints = Array.isArray(persona.painPoints) && persona.painPoints.length > 0 ?
        await safeRefine('batchTextArray', persona.painPoints, { itemType: 'painPoint' }) :
        { success: true, data: [] };
      
      const refinedGoals = Array.isArray(persona.goals) && persona.goals.length > 0 ?
        await safeRefine('batchTextArray', persona.goals, { itemType: 'goal' }) :
        { success: true, data: [] };
      
      const refinedValueProp = Array.isArray(persona.valueProposition) && persona.valueProposition.length > 0 ?
        await safeRefine('batchTextArray', persona.valueProposition, { itemType: 'personaValueProp' }) :
        { success: true, data: [] };
      
      const refinedCTA = Array.isArray(persona.specificCTA) && persona.specificCTA.length > 0 ?
        await safeRefine('batchTextArray', persona.specificCTA, { itemType: 'personaCTA' }) :
        { success: true, data: [] };

      return {
        title: refinedTitle.success ? refinedTitle.data.filter(t => typeof t === 'string' && t.trim()) : (Array.isArray(persona.title) ? persona.title.filter(t => typeof t === 'string' && t.trim()) : []),
        seniority: persona.seniority,
        department: refinedDepartment.success ? refinedDepartment.data.filter(d => typeof d === 'string' && d.trim()) : (Array.isArray(persona.department) ? persona.department.filter(d => typeof d === 'string' && d.trim()) : []),
        decisionInfluence: persona.decisionInfluence,
        primaryResponsibilities: refinedResponsibilities.success ? refinedResponsibilities.data.filter(item => item && typeof item === 'string' && item.trim()) : (Array.isArray(persona.primaryResponsibilities) ? persona.primaryResponsibilities.filter(item => item && typeof item === 'string' && item.trim()) : []),
        okrs: refinedOkrs.success ? refinedOkrs.data.filter(item => item && typeof item === 'string' && item.trim()) : (Array.isArray(persona.okrs) ? persona.okrs.filter(item => item && typeof item === 'string' && item.trim()) : []),
        challenges: refinedChallenges.success ? refinedChallenges.data.filter(item => item && typeof item === 'string' && item.trim()) : (Array.isArray(persona.challenges) ? persona.challenges.filter(item => item && typeof item === 'string' && item.trim()) : []),
        painPoints: refinedPainPoints.success ? refinedPainPoints.data.filter(item => item && typeof item === 'string' && item.trim()) : (Array.isArray(persona.painPoints) ? persona.painPoints.filter(item => item && typeof item === 'string' && item.trim()) : []),
        goals: refinedGoals.success ? refinedGoals.data.filter(item => item && typeof item === 'string' && item.trim()) : (Array.isArray(persona.goals) ? persona.goals.filter(item => item && typeof item === 'string' && item.trim()) : []),
        valueProposition: refinedValueProp.success ? refinedValueProp.data.filter(v => typeof v === 'string' && v.trim()) : (Array.isArray(persona.valueProposition) ? persona.valueProposition.filter(v => typeof v === 'string' && v.trim()) : []),
        specificCTA: refinedCTA.success ? refinedCTA.data.filter(c => typeof c === 'string' && c.trim()) : (Array.isArray(persona.specificCTA) ? persona.specificCTA.filter(c => typeof c === 'string' && c.trim()) : [])
      };
    };

    // Transform and save the enhanced ICP data to match new schema
    const updateData = {
      domain: enhancedICPData.domain,
      adminAccess: enhancedICPData.adminAccess,
      product: {
        valueProposition: refinedValueProp.success ? refinedValueProp.data : (enhancedICPData.product?.valueProposition || ''),
        valuePropositionVariations: refinedValuePropVariations.success ? refinedValuePropVariations.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.product?.valuePropositionVariations || []).filter(item => item && typeof item === 'string' && item.trim()),
        problemsWithRootCauses: refinedProblems.success ? refinedProblems.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.product?.problemsWithRootCauses || []).filter(item => item && typeof item === 'string' && item.trim()),
        keyFeatures: refinedFeatures.success ? refinedFeatures.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.product?.keyFeatures || []).filter(item => item && typeof item === 'string' && item.trim()),
        businessOutcomes: refinedBusinessOutcomes.success ? refinedBusinessOutcomes.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.product?.businessOutcomes || []).filter(item => item && typeof item === 'string' && item.trim()),
        uniqueSellingPoints: refinedUSPs.success ? refinedUSPs.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.product?.uniqueSellingPoints || []).filter(item => item && typeof item === 'string' && item.trim()),
        urgencyConsequences: refinedUrgencyConsequences.success ? refinedUrgencyConsequences.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.product?.urgencyConsequences || []).filter(item => item && typeof item === 'string' && item.trim()),
        competitorAnalysis: refinedCompetitorAnalysis.filter(comp => 
          comp && (comp.domain?.trim() || comp.differentiation?.trim())
        ),
        useCases: refinedUseCases.success ? refinedUseCases.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.product?.useCases || []).filter(item => item && typeof item === 'string' && item.trim()),
        description: refinedDescription.success ? refinedDescription.data : (enhancedICPData.product?.description || ''),
        category: refinedCategory.success ? refinedCategory.data : (enhancedICPData.product?.category || '')
      },
      offerSales: {
        pricingTiers: refinedPricingTiers.success ? refinedPricingTiers.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.offerSales?.pricingTiers || []).filter(item => item && typeof item === 'string' && item.trim()),
        clientTimeline: refinedClientTimeline.success ? refinedClientTimeline.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.offerSales?.clientTimeline || []).filter(item => item && typeof item === 'string' && item.trim()),
        roiRequirements: refinedRoiRequirements.success ? refinedRoiRequirements.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.offerSales?.roiRequirements || []).filter(item => item && typeof item === 'string' && item.trim()),
        salesDeckUrl: (enhancedICPData.offerSales?.salesDeckUrl || []).filter(item => item && typeof item === 'string' && item.trim())
      },
      socialProof: {
        caseStudies: refinedCaseStudies.filter(study => 
          study && (study.url?.trim() || study.title?.trim() || study.description?.trim())
        ),
        testimonials: refinedTestimonials.filter(testimonial => 
          testimonial && (testimonial.content?.trim() || testimonial.author?.trim())
        )
      },
      outboundExperience: {
        successfulEmails: refinedSuccessfulEmails.success ? refinedSuccessfulEmails.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.outboundExperience?.successfulEmails || []).filter(item => item && typeof item === 'string' && item.trim()),
        successfulCallScripts: refinedSuccessfulCallScripts.success ? refinedSuccessfulCallScripts.data.filter(item => item && typeof item === 'string' && item.trim()) : (enhancedICPData.outboundExperience?.successfulCallScripts || []).filter(item => item && typeof item === 'string' && item.trim())
      },
      numberOfSegments: enhancedICPData.numberOfSegments
    };

    // Handle segments data with nested personas - with refinement
    if (enhancedICPData.segments && enhancedICPData.segments.length > 0) {
      updateData.segments = await Promise.all(enhancedICPData.segments.map(async (segment) => {
        // Refine segment-level fields
        const segmentContext = { segmentIndustry: segment.industry, segmentName: segment.name };
        
        const refinedSegmentName = segment.name ? 
          await safeRefine('segmentName', segment.name, segmentContext) :
          { success: true, data: segment.name || '' };
        
        const refinedIndustry = segment.industry ? 
          await safeRefine('productName', segment.industry, segmentContext) :
          { success: true, data: segment.industry || '' };
        
        const refinedCompanySize = segment.companySize ? 
          await safeRefine('productName', segment.companySize, segmentContext) :
          { success: true, data: segment.companySize || '' };
        
        const refinedGeography = segment.geography ? 
          await safeRefine('productName', segment.geography, segmentContext) :
          { success: true, data: segment.geography || '' };
        
        const refinedAwarenessLevel = Array.isArray(segment.awarenessLevel) && segment.awarenessLevel.length > 0 ?
          await safeRefine('batchTextArray', segment.awarenessLevel, { ...segmentContext, itemType: 'awarenessLevel' }) :
          { success: true, data: [] };

        // Refine personas within this segment
        const refinedPersonas = segment.personas ? 
          await Promise.all(segment.personas.map(persona => refinePersona(persona, segmentContext))) : 
          [];

        return {
          name: refinedSegmentName.success ? refinedSegmentName.data : segment.name,
          industry: refinedIndustry.success ? refinedIndustry.data : segment.industry,
          companySize: refinedCompanySize.success ? refinedCompanySize.data : segment.companySize,
          geography: refinedGeography.success ? refinedGeography.data : segment.geography,
          awarenessLevel: refinedAwarenessLevel.success ? refinedAwarenessLevel.data.filter(level => typeof level === 'string' && level.trim()) : (Array.isArray(segment.awarenessLevel) ? segment.awarenessLevel.filter(level => typeof level === 'string' && level.trim()) : []),
          personas: refinedPersonas.filter(persona => Array.isArray(persona.title) && persona.title.length > 0)
        };
      }));
    }

    // Handle top-level personas array - with refinement
    if (enhancedICPData.personas && enhancedICPData.personas.length > 0) {
      updateData.personas = await Promise.all(enhancedICPData.personas.map(persona => refinePersona(persona)));
    }

    // Apply all updates
    Object.assign(workspace, updateData);

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

// Add a collaborator to a workspace
router.post('/add-collaborator', auth, addCollaborator);

router.get('/get-collaborators/:workspaceId', auth, getCollaborators);

router.post('/remove-collaborator', auth, removeCollaborator);


module.exports = router;
