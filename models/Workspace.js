const mongoose = require('mongoose');

// Schema for detailed product information
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  targetAudience: String,
  valueProposition: String,
  problems: [String],
  features: [String],
  benefits: [String],
  useCases: [String],
  competitors: [String],
  uniqueSellingPoints: [String],
  usps: [String], // Keep for backwards compatibility
  solution: String,
  whyNow: [String],
  pricing: String,
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Schema for detailed persona information
const PersonaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: String,
  department: String,
  seniority: String,
  industry: String,
  company: String,
  location: String,
  description: String,
  painPoints: [String],
  goals: [String],
  responsibilities: [String],
  challenges: [String],
  decisionInfluence: { type: String, enum: ['Decision Maker', 'Influencer', 'User', 'Gatekeeper'], default: 'Decision Maker' },
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

// Schema for detailed segment information
const SegmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  size: String,
  region: String,
  budget: String,
  focus: String,
  industry: String,
  companySize: String,
  revenue: String,
  geography: String,
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
  painPoints: [String],
  buyingProcesses: [String],
  firmographics: [{
    label: String,
    value: String
  }],
  benefits: String,
  awarenessLevel: { type: String, enum: ['Problem', 'Solution', 'Product', 'Brand'], default: 'Solution' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  qualification: {
    idealCriteria: [String],
    lookalikeCompanies: [String],
    disqualifyingCriteria: [String]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const WorkspaceSchema = new mongoose.Schema({
  name: String,
  companyName: String,
  companyUrl: String,
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  slug: String,

  // New onboarding structure
  admin: {
    emailSignatures: [
      {
        firstName: String,
        lastName: String,
        title: String
      }
    ],
    platformAccess: Boolean,
    domain: String
  },
  productUnderstanding: {
    valueProposition: [String],
    problemsSolved: [String],
    keyFeatures: [String],
    solutionsOutcomes: [String],
    usps: [String],
    urgency: [String],
    competitorAnalysis: [
      {
        domain: String,
        differentiation: String
      }
    ]
  },
  offerSales: {
    pricingPackages: [String],
    clientTimelineROI: String,
    salesDeckUrl: String
  },
  socialProof: {
    caseStudies: [
      {
        url: String,
        segment: String
      }
    ],
    testimonials: [String]
  },
  targetSegments: [
    {
      name: String,
      firmographics: {
        industry: String,
        employeeCount: String,
        locations: [String]
      },
      signals: [String],
      qualification: {
        tier1Criteria: [String],
        lookalikeCompanyUrls: [String],
        disqualifyingCriteria: [String]
      },
      messaging: {
        specificBenefits: [String],
        awarenessLevel: String,
        ctaOptions: [String]
      },
      personas: [
        {
          mappedSegment: String,
          department: String,
          jobTitles: [String],
          valueProposition: String,
          specificCTA: String,
          responsibilities: [String],
          okrs: [String],
          painPoints: [String]
        }
      ]
    }
  ],
  previousOutboundExperience: {
    successfulEmailsOrDMs: [
      {
        subjectLine: String,
        outcome: String
      }
    ],
    coldCallScripts: [
      {
        name: String,
        content: String
      }
    ]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
