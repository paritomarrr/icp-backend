// services/airtableService.js
const Airtable = require('airtable');

// Airtable Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(BASE_ID);

// Helper to map stepData to Airtable fields
function mapStepDataToAirtableFields(stepData) {
  const fields = {};

  // Map frontend field names to Airtable field names
  // Basic company info - only include if they have values
  if (stepData.domain || stepData.companyUrl) {
    fields['Domain'] = stepData.domain || stepData.companyUrl;
  }
  if (stepData.emailSignatures) {
    fields['Email Signatures'] = stepData.emailSignatures;
  }
  if (stepData.valueProposition) {
    fields['Value Proposition'] = stepData.valueProposition;
  }
  
  // Map frontend fields to Airtable fields
  if (stepData.problems) {
    fields['Problems'] = Array.isArray(stepData.problems) ? stepData.problems.join(', ') : stepData.problems;
  }
  if (stepData.products) {
    fields['Features'] = Array.isArray(stepData.products) ? stepData.products.join(', ') : stepData.products;
  }
  if (stepData.solutions) {
    fields['Solutions'] = Array.isArray(stepData.solutions) ? stepData.solutions.join(', ') : stepData.solutions;
  }
  if (stepData.usps) {
    fields['USPs'] = Array.isArray(stepData.usps) ? stepData.usps.join(', ') : stepData.usps;
  }
  if (stepData.whyNow) {
    fields['Why now'] = stepData.whyNow;
  }
  if (stepData.competitors) {
    fields['Competitors'] = Array.isArray(stepData.competitors)
      ? stepData.competitors.map(c => (typeof c === 'string' ? c : `${c.name}${c.url ? ' (' + c.url + ')' : ''}`)).join(', ')
      : stepData.competitors;
  }
  if (stepData.packages) {
    fields['Packages'] = stepData.packages;
  }
  if (stepData.timeline) {
    fields['Timeline'] = stepData.timeline;
  }
  if (stepData.salesDeckUrl) {
    fields['Sales Deck URL'] = stepData.salesDeckUrl;
  }
  if (stepData.caseStudies) {
    fields['Case Studies'] = Array.isArray(stepData.caseStudies) ? stepData.caseStudies.join(', ') : stepData.caseStudies;
  }
  if (stepData.testimonials) {
    fields['Testimonials'] = Array.isArray(stepData.testimonials) ? stepData.testimonials.join(', ') : stepData.testimonials;
  }

  // Only include 'Number of Segments' if it is a valid number
  let numSegments = stepData.numberOfSegments || stepData.numSegments;
  if (typeof numSegments === 'string') numSegments = parseInt(numSegments);
  if (typeof numSegments === 'number' && !isNaN(numSegments)) {
    fields['Number of Segments'] = numSegments;
  }

  // Segment 1 - only include if they have values
  if (stepData.employeeCount1) fields['Employee Count (Segment 1)'] = stepData.employeeCount1;
  if (stepData.industry1) fields['Industry (Segment 1)'] = stepData.industry1;
  if (stepData.signals1) fields['Signals (Segment 1)'] = stepData.signals1;
  if (stepData.tier1Criteria1) fields['Tier 1 Criteria (Segment 1)'] = stepData.tier1Criteria1;
  if (stepData.lookalikeUrl1) fields['Lookalike URL (Segment 1)'] = stepData.lookalikeUrl1;
  if (stepData.disqualifyingCriteria1) fields['Disqualifying Criteria (Segment 1)'] = stepData.disqualifyingCriteria1;
  if (stepData.awarenessLevel1) {
    const awarenessLevel1 = Array.isArray(stepData.awarenessLevel1) 
      ? stepData.awarenessLevel1.join(', ') 
      : stepData.awarenessLevel1;
    if (awarenessLevel1 && awarenessLevel1.trim()) {
      fields['Awareness Level (Segment 1)'] = awarenessLevel1;
    }
  }
  if (stepData.specificBenefits1) fields['Specific Benefits (Segment 1)'] = stepData.specificBenefits1;
  if (stepData.ctaOptions1) fields['CTA Options (Segment 1)'] = stepData.ctaOptions1;

  // Segment 2
  if (stepData.employeeCount2) fields['Employee Count (Segment 2)'] = stepData.employeeCount2;
  if (stepData.industry2) fields['Industry (Segment 2)'] = stepData.industry2;
  if (stepData.signals2) fields['Signals (Segment 2)'] = stepData.signals2;
  if (stepData.tier1Criteria2) fields['Tier 1 Criteria (Segment 2)'] = stepData.tier1Criteria2;
  if (stepData.lookalikeUrl2) fields['Lookalike URL (Segment 2)'] = stepData.lookalikeUrl2;
  if (stepData.disqualifyingCriteria2) fields['Disqualifying Criteria (Segment 2)'] = stepData.disqualifyingCriteria2;
  if (stepData.awarenessLevel2) {
    const awarenessLevel2 = Array.isArray(stepData.awarenessLevel2) 
      ? stepData.awarenessLevel2.join(', ') 
      : stepData.awarenessLevel2;
    if (awarenessLevel2 && awarenessLevel2.trim()) {
      fields['Awareness Level (Segment 2)'] = awarenessLevel2;
    }
  }
  if (stepData.specificBenefits2) fields['Specific Benefits (Segment 2)'] = stepData.specificBenefits2;
  if (stepData.ctaOptions2) fields['CTA Options (Segment 2)'] = stepData.ctaOptions2;

  // Segment 3
  if (stepData.employeeCount3) fields['Employee Count (Segment 3)'] = stepData.employeeCount3;
  if (stepData.industry3) fields['Industry (Segment 3)'] = stepData.industry3;
  if (stepData.signals3) fields['Signals (Segment 3)'] = stepData.signals3;
  if (stepData.tier1Criteria3) fields['Tier 1 Criteria (Segment 3)'] = stepData.tier1Criteria3;
  if (stepData.lookalikeUrl3) fields['Lookalike URL (Segment 3)'] = stepData.lookalikeUrl3;
  if (stepData.disqualifyingCriteria3) fields['Disqualifying Criteria (Segment 3)'] = stepData.disqualifyingCriteria3;
  if (stepData.awarenessLevel3) {
    const awarenessLevel3 = Array.isArray(stepData.awarenessLevel3) 
      ? stepData.awarenessLevel3.join(', ') 
      : stepData.awarenessLevel3;
    if (awarenessLevel3 && awarenessLevel3.trim()) {
      fields['Awareness Level (Segment 3)'] = awarenessLevel3;
    }
  }
  if (stepData.specificBenefits3) fields['Specific Benefits (Segment 3)'] = stepData.specificBenefits3;
  if (stepData.ctaOptions3) fields['CTA Options (Segment 3)'] = stepData.ctaOptions3;

  // Segment 4
  if (stepData.employeeCount4) fields['Employee Count (Segment 4)'] = stepData.employeeCount4;
  if (stepData.industry4) fields['Industry (Segment 4)'] = stepData.industry4;
  if (stepData.signals4) fields['Signals (Segment 4)'] = stepData.signals4;
  if (stepData.tier1Criteria4) fields['Tier 1 Criteria (Segment 4)'] = stepData.tier1Criteria4;
  if (stepData.lookalikeUrl4) fields['Lookalike URL (Segment 4)'] = stepData.lookalikeUrl4;
  if (stepData.disqualifyingCriteria4) fields['Disqualifying Criteria (Segment 4)'] = stepData.disqualifyingCriteria4;
  if (stepData.specificBenefits4) fields['Specific Benefits (Segment 4)'] = stepData.specificBenefits4;
  if (stepData.ctaOptions4) fields['CTA Options (Segment 4)'] = stepData.ctaOptions4;

  // Decision Makers, Champions, End Users, Locations (Segments 1-4)
  if (stepData.decisionMaker1) fields['Decision Maker (Segment 1)'] = stepData.decisionMaker1;
  if (stepData.champion1) fields['Champion (Segment 1)'] = stepData.champion1;
  if (stepData.endUser1) fields['End User (Segment 1)'] = stepData.endUser1;
  if (stepData.decisionMaker2) fields['Decision Maker (Segment 2)'] = stepData.decisionMaker2;
  if (stepData.champion2) fields['Champion (Segment 2)'] = stepData.champion2;
  if (stepData.endUser2) fields['End User (Segment 2)'] = stepData.endUser2;
  if (stepData.decisionMaker3) fields['Decision Maker (Segment 3)'] = stepData.decisionMaker3;
  if (stepData.champion3) fields['Champion (Segment 3)'] = stepData.champion3;
  if (stepData.endUser3) fields['End User (Segment 3)'] = stepData.endUser3;
  if (stepData.decisionMaker4) fields['Decision Maker (Segment 4)'] = stepData.decisionMaker4;
  if (stepData.champion4) fields['Champion (Segment 4)'] = stepData.champion4;
  if (stepData.endUser4) fields['End User (Segment 4)'] = stepData.endUser4;
  if (stepData.locations1) fields['Locations (Segment 1)'] = stepData.locations1;
  if (stepData.location2) fields['Location (Segment 2)'] = stepData.location2;
  if (stepData.locations3) fields['Locations (Segment 3)'] = stepData.locations3;
  if (stepData.locations4) fields['Locations (Segment 4)'] = stepData.locations4;

  return fields;
}

async function submitToAirtable(stepData) {
  try {

    const mappedFields = mapStepDataToAirtableFields(stepData);
    
    
    const record = await base(TABLE_NAME).create([
      {
        fields: mappedFields
      }
    ]);

    return {
      success: true,
      recordId: record[0].id,
      data: record[0].fields
    };
  } catch (error) {
    console.error('Airtable submission error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function updateAirtableRecord(recordId, stepData) {
  try {
    const record = await base(TABLE_NAME).update([
      {
        id: recordId,
        fields: mapStepDataToAirtableFields(stepData)
      }
    ]);

    return {
      success: true,
      recordId: record[0].id,
      data: record[0].fields
    };
  } catch (error) {
    console.error('Airtable update error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  submitToAirtable,
  updateAirtableRecord
}; 