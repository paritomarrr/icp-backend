const mongoose = require('mongoose');

// Enhanced schema for admin and access information
const AdminAccessSchema = new mongoose.Schema({
  emailSignatures: [{
    firstName: String,
    lastName: String,
    title: String
  }],
  platformAccessGranted: { type: Boolean, default: false }
});

// Schema for offer and sales information
const OfferSalesSchema = new mongoose.Schema({
  pricingTiers: [String],
  clientTimeline: [String],
  roiRequirements: [String],
  salesDeckUrl: [String]
});

// Enhanced schema for detailed product information
const ProductSchema = new mongoose.Schema({
  valueProposition: String,
  valuePropositionVariations: [String],
  problemsWithRootCauses: [String],
  keyFeatures: [String],
  businessOutcomes: [String],
  uniqueSellingPoints: [String],
  urgencyConsequences: [String],
  competitorAnalysis: [{
    domain: String,
    differentiation: String
  }],
  useCases: [String],
  description: String,
  category: String,
  pricingTiers: [String], // Added field
  clientTimeline: [String], // Added field
  roiRequirements: [String], // Added field
  salesDeckUrl: [String] // Added field
});

// Enhanced schema for detailed persona information
const PersonaSchema = new mongoose.Schema({
  title: [String],
  jobTitles: [String],
  department: [String],
  seniority: String,
  decisionInfluence: { type: String, enum: ['Decision Maker', 'Champion', 'End User'], default: 'Decision Maker' },
  primaryResponsibilities: [String],
  okrs: [String],
  challenges: [String],
  painPoints: [String],
  goals: [String],
  valueProposition: [String],
  specificCTA: [String],
  description: String, // Added field
  category: String // Added field
});

// Enhanced schema for detailed segment information
const SegmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  industry: String,
  companySize: String,
  geography: String,
  awarenessLevel: { 
    type: String, 
    enum: ['Unaware', 'Problem Aware', 'Solution Aware', 'Product Aware', 'Brand Aware', ''], 
    default: '' 
  },
  personas: [PersonaSchema] // Nested personas within each segment
});

// Schema for social proof
const SocialProofSchema = new mongoose.Schema({
  caseStudies: [{
    url: String,
    marketSegment: String,
    title: String,
    description: String
  }],
  testimonials: [{
    content: String,
    author: String,
    company: String,
    metrics: String,
    title: String
  }],
  metrics: String // Added field
});

// Schema for outbound experience
const OutboundExperienceSchema = new mongoose.Schema({
  successfulEmails: [String],
  successfulCallScripts: [String],
  outreachPerformance: String // Added field
});

const WorkspaceSchema = new mongoose.Schema({
  name: String,
  slug: String,
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  domain: String,
  companyDescription: String, // Added field
  companyValueAndMissionSummary: String, // Added field
  adminAccess: AdminAccessSchema,
  product: ProductSchema,
  offerSales: OfferSalesSchema,
  socialProof: SocialProofSchema,
  numberOfSegments: { type: Number, default: 1 },
  segments: [SegmentSchema],
  personas: [PersonaSchema],
  outboundExperience: OutboundExperienceSchema,
  enrichmentVersions: [String] // Added field
}, {
  timestamps: true
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
