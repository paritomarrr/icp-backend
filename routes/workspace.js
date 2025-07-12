const express = require("express");
const Workspace = require("../models/Workspace");
const auth = require("../middleware/auth");
const router = express.Router();
const { callClaudeForICP } = require('../services/claudeService');
const slugify = require('slugify');

// Create Workspace
router.post("/", auth, async (req, res) => {
  const { name, companyName, companyUrl } = req.body;

  if (!name || !companyName || !companyUrl ) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;

    // Check if slug exists and increment a number if needed
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

// PUT /api/workspaces/:slug/icp
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
  
      console.log("🟡 Received ICP PUT request");
      console.log("🔍 Slug:", slug);
      console.log("📥 Payload:", {
        companyUrl,
        products,
        personas,
        useCases,
        differentiation,
        segments,
        competitors,
      });
  
      // ✅ Validate required fields
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
        console.error("❌ Validation failed");
        return res.status(400).json({ error: "Missing or invalid ICP fields" });
      }
  
      const workspace = await Workspace.findOne({ slug });
  
      if (!workspace) {
        console.error("❌ Workspace not found");
        return res.status(404).json({ error: 'Workspace not found' });
      }
  
      console.log("✅ Found workspace:", workspace.companyName);
  
      // ✅ Update fields
      workspace.companyUrl = companyUrl;
      workspace.products = products;
      workspace.personas = personas;
      workspace.useCases = useCases;
      workspace.differentiation = differentiation;
      workspace.segments = segments;
      workspace.competitors = competitors;
  
      await workspace.save();
  
      console.log("✅ Saved ICP to DB");
  
      // 👉 Trigger Claude after saving ICP
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
  
        console.log("✨ Claude enrichment added");
      } catch (err) {
        console.error('❌ Claude enrichment failed:', err);
      }
  
      console.log("✅ Returning final workspace object");
      res.status(200).json(workspace);
    } catch (err) {
      console.error('❌ Error updating ICP:', err);
      res.status(500).json({ error: 'Failed to update ICP' });
    }
  });
  

// POST /api/workspaces/:slug/icp/re-enrich
router.post('/:slug/icp/re-enrich', auth, async (req, res) => {
    try {
      const workspace = await Workspace.findOne({ slug: req.params.slug });
      if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  
      const variants = await callClaudeWithICP(workspace); // same function
      workspace.icpEnrichmentVersions = variants;
      await workspace.save();
  
      res.status(200).json({ message: 'Re-enriched successfully', data: variants });
    } catch (err) {
      console.error('Re-enrich error:', err);
      res.status(500).json({ error: 'Failed to re-enrich' });
    }
  });
  
// GET /api/workspaces/user/:userId
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
      console.error("Failed to fetch user workspaces:", error);
      res.status(500).json({ error: "Failed to fetch workspaces" });
    }
  });

// GET /api/workspaces/slug/:slug
router.get("/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
  
      const workspace = await Workspace.findOne({ slug });
  
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }
  
      return res.status(200).json(workspace);
    } catch (error) {
      console.error("Error fetching workspace by slug:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
module.exports = router;
