const express = require("express");
const Workspace = require("../models/Workspace");
const auth = require("../middleware/auth");
const router = express.Router();
const { callClaudeForICP, generateProductDetails, generatePersonaDetails, generateSegmentDetails } = require('../services/groqService');
const slugify = require('slugify');

// Create a new workspace
router.post("/", auth, async (req, res) => {
  const {
    name,
    companyName,
    companyUrl,
    admin,
    productUnderstanding,
    offerSales,
    socialProof,
    targetSegments,
    previousOutboundExperience
  } = req.body;

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
      admin: admin || { emailSignatures: [], platformAccess: false, domain: "" },
      productUnderstanding: productUnderstanding || {
        valueProposition: [],
        problemsSolved: [],
        keyFeatures: [],
        solutionsOutcomes: [],
        usps: [],
        urgency: [],
        competitorAnalysis: []
      },
      offerSales: offerSales || { pricingPackages: [], clientTimelineROI: "", salesDeckUrl: "" },
      socialProof: socialProof || { caseStudies: [], testimonials: [] },
      targetSegments: targetSegments || [],
      previousOutboundExperience: previousOutboundExperience || { successfulEmailsOrDMs: [], coldCallScripts: [] }
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
              
              // Update persona with enriched data
              persona.painPoints = enrichedData.painPoints || persona.painPoints;
              persona.goals = enrichedData.goals || persona.goals;
              persona.responsibilities = enrichedData.responsibilities || persona.responsibilities;
              persona.challenges = enrichedData.challenges || persona.challenges;
              persona.channels = enrichedData.channels || persona.channels;
              persona.objections = enrichedData.objections || persona.objections;
              
              if (enrichedData.demographics) {
                persona.demographics = {
                  ...persona.demographics,
                  ...enrichedData.demographics
                };
              }
              
              if (enrichedData.buyingBehavior) {
                persona.buyingBehavior = {
                  ...persona.buyingBehavior,
                  ...enrichedData.buyingBehavior
                };
              }
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
            awarenessLevel: 'Solution',
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

      // Update fields - convert simple arrays to detailed objects with enrichment
      workspace.companyUrl = companyUrl;
      workspace.products = await convertToDetailedProducts(products);
      workspace.personas = await convertToDetailedPersonas(personas);
      workspace.useCases = useCases;
      workspace.differentiation = differentiation;
      workspace.segments = await convertToDetailedSegments(segments);
      workspace.competitors = competitors;
  
      await workspace.save();
  
      // Optionally trigger Groq enrichment after saving ICP
      try {
        const enrichment = await callClaudeForICP({
          companyName: workspace.companyName,
          companyUrl: workspace.companyUrl,
          products: workspace.products,
          personas: workspace.personas,
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

      const variants = await callClaudeForICP(workspace);
      workspace.icpEnrichmentVersions = variants;
      await workspace.save();

      res.status(200).json({ message: 'Re-enriched successfully', data: variants });
    } catch (err) {
      res.status(500).json({ error: 'Failed to re-enrich' });
    }
  });

// Update onboarding data for a workspace by slug (new structure)
router.put('/:slug/onboarding', auth, async (req, res) => {
  try {
    const slug = req.params.slug;
    const {
      admin,
      productUnderstanding,
      offerSales,
      socialProof,
      targetSegments,
      previousOutboundExperience
    } = req.body;

    if (
      admin === undefined &&
      productUnderstanding === undefined &&
      offerSales === undefined &&
      socialProof === undefined &&
      targetSegments === undefined &&
      previousOutboundExperience === undefined
    ) {
      return res.status(400).json({ error: 'At least one onboarding field must be provided.' });
    }

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (admin !== undefined) workspace.admin = admin;
    if (productUnderstanding !== undefined) workspace.productUnderstanding = productUnderstanding;
    if (offerSales !== undefined) workspace.offerSales = offerSales;
    if (socialProof !== undefined) workspace.socialProof = socialProof;
    if (targetSegments !== undefined) workspace.targetSegments = targetSegments;
    if (previousOutboundExperience !== undefined) workspace.previousOutboundExperience = previousOutboundExperience;

    await workspace.save();
    res.status(200).json(workspace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update onboarding', details: err.message });
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
        { collaborators: { $elemMatch: { email: userEmail } } }
      ]
    });

    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workspaces", details: err.message });
  }
});

// Get a workspace by slug
router.get("/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
  
      const workspace = await Workspace.findOne({ slug });
  
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
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

    // Add timestamps
    productData.createdAt = new Date();
    productData.updatedAt = new Date();

    workspace.products.push(productData);
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

    const product = workspace.products.id(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update fields
    Object.assign(product, updateData, { updatedAt: new Date() });
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

    workspace.products.id(productId).remove();
    await workspace.save();

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
});

// ==================== PERSONA ROUTES ====================

// Add a new persona to workspace
router.post('/:slug/personas', auth, async (req, res) => {
  try {
    const { slug } = req.params;
    const personaData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Add timestamps
    personaData.createdAt = new Date();
    personaData.updatedAt = new Date();

    workspace.personas.push(personaData);
    await workspace.save();

    res.status(201).json({ 
      success: true, 
      persona: workspace.personas[workspace.personas.length - 1] 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add persona', details: error.message });
  }
});

// Update a persona
router.put('/:slug/personas/:personaId', auth, async (req, res) => {
  try {
    const { slug, personaId } = req.params;
    const updateData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const persona = workspace.personas.id(personaId);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // Update fields
    Object.assign(persona, updateData, { updatedAt: new Date() });
    await workspace.save();

    res.json({ success: true, persona });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update persona', details: error.message });
  }
});

// Delete a persona
router.delete('/:slug/personas/:personaId', auth, async (req, res) => {
  try {
    const { slug, personaId } = req.params;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    workspace.personas.id(personaId).remove();
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

    // Add timestamps
    segmentData.createdAt = new Date();
    segmentData.updatedAt = new Date();

    workspace.segments.push(segmentData);
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

    const segment = workspace.segments.id(segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    // Update fields
    Object.assign(segment, updateData, { updatedAt: new Date() });
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

    workspace.segments.id(segmentId).remove();
    await workspace.save();

    res.json({ success: true, message: 'Segment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete segment', details: error.message });
  }
});

module.exports = router;
