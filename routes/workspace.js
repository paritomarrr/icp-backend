const express = require("express");
const Workspace = require("../models/Workspace");
const auth = require("../middleware/auth");
const router = express.Router();
const { callClaudeForICP, generateProductDetails, generatePersonaDetails, generateSegmentDetails } = require('../services/groqService');
const slugify = require('slugify');

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
      workspace.useCases = useCases;
      workspace.differentiation = differentiation;
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

// Add a new persona to a specific segment
router.post('/:slug/segments/:segmentId/personas', auth, async (req, res) => {
  try {
    const { slug, segmentId } = req.params;
    const personaData = req.body;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const segment = workspace.segments.id(segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    // Add timestamps
    personaData.createdAt = new Date();
    personaData.updatedAt = new Date();

    if (!segment.personas) {
      segment.personas = [];
    }
    segment.personas.push(personaData);
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

    const segment = workspace.segments.id(segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const persona = segment.personas.id(personaId);
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

// Delete a persona from a segment
router.delete('/:slug/segments/:segmentId/personas/:personaId', auth, async (req, res) => {
  try {
    const { slug, segmentId, personaId } = req.params;

    const workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
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
      numberOfSegments: enhancedICPData.numberOfSegments,
      // Add direct field mappings for single value fields
      enhancedICPForm: {
        productValueProposition: enhancedICPData.product?.valueProposition || '',
        clientTimeline: enhancedICPData.offerSales?.clientTimeline || '',
        roiRequirements: enhancedICPData.offerSales?.roiRequirements || '',
        salesDeckUrl: enhancedICPData.offerSales?.salesDeckUrl || ''
      }
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
        salesDeckUrl: enhancedICPData.offerSales?.salesDeckUrl || '',
        updatedAt: new Date()
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

module.exports = router;
