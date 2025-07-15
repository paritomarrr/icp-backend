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

// Enhanced schema for detailed product information
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  targetAudience: String,
  valueProposition: String,
  valuePropositionVariations: [String], // For different offerings
  problems: [String],
  problemsWithRootCauses: [String], // Enhanced: problems with root causes
  features: [String],
  keyFeatures: [String], // Most noteworthy features
  benefits: [String],
  businessOutcomes: [String], // Business outcomes with metrics
  useCases: [String],
  competitors: [String],
  competitorAnalysis: [{
    domain: String,
    differentiation: String
  }],
  uniqueSellingPoints: [String],
  usps: [String], // Keep for backwards compatibility
  solution: String,
  whyNow: [String],
  urgencyConsequences: [String], // Consequences of not solving problems
  pricing: String,
  pricingTiers: [String], // Different pricing packages
  clientTimeline: [String], // ROI timeline entries
  roiRequirements: [String], // What's required from client end
  salesDeckUrl: [String], // Array of sales deck URLs
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Enhanced schema for detailed persona information
const PersonaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: String,
  jobTitles: [String], // Multiple job titles for the persona
  department: String,
  seniority: String,
  industry: String,
  company: String,
  location: String,
  description: String,
  mappedSegment: String, // Which segment this persona belongs to
  valueProposition: String, // Role-specific value proposition
  specificCTA: String, // Specific call-to-action for this persona
  primaryResponsibilities: [String], // Core duties within the company
  okrs: [String], // Objectives and key results they're responsible for
  painPoints: [String],
  goals: [String],
  responsibilities: [String],
  challenges: [String],
  decisionInfluence: { type: String, enum: ['Decision Maker', 'Champion', 'End User', 'Influencer', 'Gatekeeper'], default: 'Decision Maker' },
  budget: String,
  teamSize: String,
  channels: [String],
  objections: [String],
  triggers: [String],
  messaging: String,
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  contactInfo: {
    email: String,
    phone: String,
    linkedin: String,
    location: String
  },
  demographics: {
    age: String,
    experience: String,
    education: String,
    industry: String
  },
  buyingBehavior: {
    researchTime: String,
    decisionFactors: [String],
    preferredChannels: [String]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Enhanced schema for detailed segment information
const SegmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  size: String,
  region: String,
  budget: String,
  focus: String,
  industry: String,
  companySize: String,
  employeeCount: String, // Enhanced: specific employee count ranges
  idealEmployeeRange: {
    min: Number,
    max: Number
  },
  revenue: String,
  geography: String,
  locations: [String], // Multiple locations
  employees: String,
  marketSize: String,
  growthRate: String,
  customerCount: String,
  competitiveIntensity: String,
  characteristics: [String],
  industries: [String],
  companySizes: [String],
  technologies: [String],
  qualificationCriteria: [String],
  signals: [String], // Qualifying or outreach-relevant signals (techographics, structure, social signals)
  painPoints: [String],
  buyingProcesses: [String],
  firmographics: [{
    label: String,
    value: String
  }],
  benefits: String,
  specificBenefits: [String], // Specific USP for this segment
  awarenessLevel: { 
    type: String, 
    enum: ['Unaware', 'Problem Aware', 'Solution Aware', 'Product Aware', 'Brand Aware'], 
    default: 'Solution Aware' 
  },
  ctaOptions: [String], // CTA options ranked by priority
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  qualification: {
    tier1Criteria: [String], // Tier 1 qualification criteria
    idealCriteria: [String],
    lookalikeCompanies: [String], // Company URLs for lookalikes
    disqualifyingCriteria: [String]
  },
  personas: [PersonaSchema], // Nested personas within each segment
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
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
  }]
});

// Schema for outbound experience
const OutboundExperienceSchema = new mongoose.Schema({
  successfulEmails: [String], // Outbound emails/DMs that performed well
  successfulCallScripts: [String] // Cold call scripts that worked well
});

const WorkspaceSchema = new mongoose.Schema({
  name: String,
  companyName: String,
  companyUrl: String,
  domain: String, // Company domain
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  slug: String,

  // New enhanced sections
  adminAccess: AdminAccessSchema,
  socialProof: SocialProofSchema,
  outboundExperience: OutboundExperienceSchema,
  numberOfSegments: { type: Number, default: 1 }, // How many segments to target

  // Updated to use detailed schemas
  products: [ProductSchema],
  segments: [SegmentSchema], // Segments now contain nested personas
  
  // Keep existing simple arrays for backwards compatibility if needed
  useCases: [String],
  differentiation: String,
  competitors: [
    {
      name: String,
      url: String
    }
  ],
  
  // Keep enrichment versions for migration/backup purposes
  icpEnrichmentVersions: {
    type: Map,
    of: Object // stores { 1: {...}, 2: {...}, ... }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
