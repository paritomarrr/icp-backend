const express = require("express");
const Workspace = require("../models/Workspace");
const auth = require("../middleware/auth");
const router = express.Router();
const { callClaudeForICP } = require('../services/claudeService');
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
  
      // Update fields
      workspace.companyUrl = companyUrl;
      workspace.products = products;
      workspace.personas = personas;
      workspace.useCases = useCases;
      workspace.differentiation = differentiation;
      workspace.segments = segments;
      workspace.competitors = competitors;
  
      await workspace.save();
  
      // Optionally trigger Claude enrichment after saving ICP
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
  
      const variants = await callClaudeWithICP(workspace);
      workspace.icpEnrichmentVersions = variants;
      await workspace.save();
  
      res.status(200).json({ message: 'Re-enriched successfully', data: variants });
    } catch (err) {
      res.status(500).json({ error: 'Failed to re-enrich' });
    }
  });
  
// Get all workspaces for a user
router.get("/user/:userId", auth, async (req, res) => {
    const { userId } = req.params;
  
    try {
      const workspaces = await Workspace.find({
        $or: [
          { ownerId: userId },
          { collaborators: userId }
        ]
      });
  
      res.status(200).json(workspaces);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workspaces" });
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

// Test route to check if delete endpoint is accessible
router.get("/test-delete", (req, res) => {
  res.json({ message: "Delete route is accessible" });
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

module.exports = router;
