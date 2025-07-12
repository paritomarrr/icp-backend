const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  name: String,
  companyName: String,
  companyUrl: String,
  // industry: String,
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  slug: String,

  products: [String],
  personas: [String],
  useCases: [String],
  differentiation: String,
  segments: [String],
  competitors: [
    {
      name: String,
      url: String
    }
  ],
  icpEnrichmentVersions: {
    type: Map,
    of: Object // stores { 1: {...}, 2: {...}, ... }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
