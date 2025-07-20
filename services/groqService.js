// services/claudeService.js
const fetch = require('node-fetch');

// Groq API Key (set GROQ_API_KEY in your environment)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const styleVariants = [
  "Focus on strategic depth and market positioning for large enterprise buyers.",
  "Emphasize tactical implementation, speed-to-value, and practical recommendations.",
  "Focus on innovation potential, ecosystem growth, and future-ready GTM strategy.",
  "Prioritize buyer psychology, emotional triggers, and customer-centric storytelling."
];

function generateClaudePrompt(inputs, variant) {
  return `You are a senior GTM strategist. Based on the company below, generate expanded Ideal Customer Profile (ICP) information to populate a GTM dashboard.

---

**Company**: ${inputs.companyName}  
**Website**: ${inputs.companyUrl}  
**What it does**: ${inputs.products.join(', ')}  
**Competitors**: ${inputs.competitors.map(c => c.name).join(', ')}  
**Customer Types**: ${inputs.segments.join(', ')}

---

Your goal is to help a go-to-market team deeply understand their ideal customers by producing a structured GTM summary with the following components. Focus on clarity, accuracy, and real-world GTM usage. This will power dashboards and automation.

Return exactly these fields in **valid JSON** format:

1. oneLiner
2. companySummary
3. products { problems[], features[], solution, usp[], whyNow[] }
4. competitorDomains[]
5. salesDeckIdeas[]
6. caseStudies[]
7. ctaOptions[]
8. segments[]
9. personasTable[]

Respond in **valid JSON only**. No Markdown or explanation.\n\n${styleVariants[variant - 1]}`;
}

async function callClaudeForICP(inputs) {
  const variants = await Promise.all(
    [1, 2, 3, 4].map(async (variant) => {
      const prompt = generateClaudePrompt(inputs, variant);

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await res.json();

      try {
        return JSON.parse(data?.choices?.[0]?.message?.content || '{}');
      } catch (err) {
        console.error('Error parsing Claude response for variant', variant, err);
        return null;
      }
    })
  );

  return {
    1: variants[0],
    2: variants[1],
    3: variants[2],
    4: variants[3]
  };
}

// New function for product field suggestions based on domain and cumulative data
async function generateProductFieldSuggestions(fieldType, domain, cumulativeData = {}) {
  const fieldPrompts = {
    // Persona additional array fields
    personaDepartment: `Based on the persona title "${cumulativeData.personaTitle || ''}" and segment industry "${cumulativeData.segmentIndustry || ''}", suggest exactly 4 department names this persona might belong to.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Engineering", "Product", "IT", "Operations"]`,

    personaValueProp: `Based on the persona title "${cumulativeData.personaTitle || ''}", segment industry "${cumulativeData.segmentIndustry || ''}", and product value proposition "${cumulativeData.valueProposition || ''}", suggest exactly 4 value propositions tailored for this persona.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Increase team efficiency", "Reduce operational costs", "Improve product quality", "Accelerate innovation"]`,

    personaCTA: `Based on the persona title "${cumulativeData.personaTitle || ''}", segment industry "${cumulativeData.segmentIndustry || ''}", and product context, suggest exactly 4 specific calls to action that would appeal to this persona.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Request a demo", "Download whitepaper", "Join webinar", "Start free trial"]`,
    description: `Based on the company domain "${domain}", write a concise 2-3 sentence product description that explains what the company does and their main value proposition. Focus on their core business and target market.

IMPORTANT: Return ONLY the description text. No JSON, no explanation, just the description.`,

    category: `Based on the company domain "${domain}" and description "${cumulativeData.description || ''}", suggest the most appropriate product category. Choose from common categories like: SaaS, Healthcare, Fintech, E-commerce, EdTech, Marketing, Sales, HR, Operations, Security, etc.

IMPORTANT: Return ONLY the category name. No JSON, no explanation, just the category.`,

    valueProposition: `Based on the domain "${domain}", description "${cumulativeData.description || ''}", and category "${cumulativeData.category || ''}", create a compelling value proposition in 40-50 characters. Focus on the main benefit customers get.

IMPORTANT: Return ONLY the value proposition text. No JSON, no explanation, just the text.`,

    valuePropositionVariations: `Based on the domain "${domain}" and main value proposition "${cumulativeData.valueProposition || ''}", suggest exactly 4 alternative value propositions for different market segments or use cases.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Alternative 1", "Alternative 2", "Alternative 3", "Alternative 4"]`,

    // Offer & Sales field types
    pricingTiers: `Based on the domain "${domain}", product description "${cumulativeData.description || ''}", and value proposition "${cumulativeData.valueProposition || ''}", suggest exactly 4 pricing tiers/packages that would make sense for this business. Include tier name, price point, and key features.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Starter - $99/month - Up to 10 users, basic features", "Professional - $299/month - Up to 50 users, advanced analytics", "Enterprise - $999/month - Unlimited users, custom integrations", "Custom - Contact sales - White-label solution, dedicated support"]`,

    clientTimeline: `Based on the domain "${domain}" and product "${cumulativeData.description || ''}", suggest exactly 4 realistic timeline expectations and ROI metrics that clients typically experience.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Setup completed within 2 weeks with dedicated onboarding", "First results visible within 30 days of implementation", "20-30% efficiency improvement achieved by month 3", "Full ROI typically realized within 6-12 months"]`,

    roiRequirements: `Based on the domain "${domain}" and product "${cumulativeData.description || ''}", suggest exactly 4 key requirements or commitments clients need to make to achieve successful ROI.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Dedicate 2-4 hours per week during first month for setup and training", "Assign a dedicated point person for implementation and ongoing management", "Provide access to existing systems and data for integration", "Commit to using the platform consistently for minimum 3 months"]`,

    // Target Segments field types
    segmentName: `Based on the domain "${domain}", product description "${cumulativeData.description || ''}", and industry context, suggest exactly 4 potential target account segments that would be good fits for this solution.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Enterprise Manufacturing Companies (500+ employees)", "Mid-Market Healthcare Organizations", "Growing SaaS Companies (Series B+)", "Regional Financial Services Firms"]`,

    segmentIndustry: `Based on the domain "${domain}" and product "${cumulativeData.description || ''}", suggest exactly 4 specific industries that would benefit most from this solution.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Manufacturing & Industrial", "Healthcare & Life Sciences", "Financial Services", "Technology & Software"]`,

    segmentCompanySize: `Based on the domain "${domain}" and product type "${cumulativeData.category || ''}", suggest exactly 4 company size ranges that would be ideal targets for this solution.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["50-200 employees, $10M-$50M revenue", "200-1000 employees, $50M-$200M revenue", "1000+ employees, $200M+ revenue", "Enterprise (5000+ employees, $1B+ revenue)"]`,

    segmentGeography: `Based on the domain "${domain}" and business type, suggest exactly 4 geographic markets that would be good targets for this solution.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["North America (US & Canada)", "Western Europe (UK, Germany, France)", "Asia-Pacific (Australia, Singapore, Japan)", "Global (All English-speaking markets)"]`,

    // Persona field types  
    personaTitle: `Based on the segment industry "${cumulativeData.segmentIndustry || ''}" and company size "${cumulativeData.segmentCompanySize || ''}", suggest exactly 4 job titles that would be key decision makers or influencers for "${cumulativeData.description || 'this solution'}".

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["VP of Engineering", "IT Director", "Chief Technology Officer", "Head of Operations"]`,

    personaSeniority: `Based on the job title context and industry, suggest exactly 4 seniority levels that would be appropriate for decision makers in this context.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Senior Manager", "Director", "Vice President", "C-Level Executive"]`,

    personaResponsibilities: `Based on the persona title "${cumulativeData.personaTitle || ''}" in "${cumulativeData.segmentIndustry || ''}" industry, suggest exactly 4 primary responsibilities this person would have in their role.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Oversee technology infrastructure and security", "Manage team of 10-15 engineers and developers", "Drive digital transformation initiatives", "Evaluate and implement new software solutions"]`,

    personaChallenges: `Based on the persona title "${cumulativeData.personaTitle || ''}" in "${cumulativeData.segmentIndustry || ''}" industry, suggest exactly 4 key challenges or pain points this person typically faces that "${cumulativeData.description || 'our solution'}" could help solve.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Limited budget for new technology implementations", "Pressure to reduce operational costs while maintaining quality", "Difficulty finding and retaining skilled technical talent", "Need to integrate multiple legacy systems efficiently"]`,

    personaOKRs: `Based on the persona title "${cumulativeData.personaTitle || ''}" in "${cumulativeData.segmentIndustry || ''}" industry, suggest exactly 4 typical OKRs (Objectives & Key Results) this person would be responsible for.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Increase system uptime to 99.9%", "Reduce security incidents by 50%", "Implement new technology stack within 6 months", "Achieve team satisfaction score of 4.5/5"]`,

    // New Segment field types for Miro structure
    segmentEmployees: `Based on the domain "${domain}" and industry context, suggest exactly 4 employee count ranges that would be appropriate targets for this solution.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["50-100", "100-500", "500-1000", "1000+"]`,

    segmentLocations: `Based on the domain "${domain}" and target market, suggest exactly 4 key locations or regions where this solution would be most valuable.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["New York, NY", "San Francisco, CA", "London, UK", "Toronto, CA"]`,

    segmentSignals: `Based on the domain "${domain}" and product type, suggest exactly 4 qualifying signals or indicators that would identify good prospects for outreach.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Recent funding announcement", "Job postings for relevant roles", "Technology stack changes", "Expansion into new markets"]`,

    segmentBenefits: `Based on the domain "${domain}" and industry "${cumulativeData.segmentIndustry || ''}", suggest exactly 4 specific benefits or value propositions for this particular segment.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["30% faster implementation for manufacturing environments", "Industry-specific compliance and security features", "Integration with existing ERP systems", "24/7 support with industry expertise"]`,

    segmentCTA: `Based on the domain "${domain}" and target segment, suggest exactly 4 call-to-action options ranked by priority that would appeal to this segment.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Book a personalized demo", "Start free 30-day trial", "Download industry report", "Schedule consultation call"]`,

    segmentTier1Criteria: `Based on the domain "${domain}" and segment context, suggest exactly 4 Tier 1 qualification criteria that would identify the highest-value prospects.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Annual budget above $100K for this category", "Decision maker identified and accessible", "Active evaluation process within 6 months", "Current pain point with existing solution"]`,

    segmentLookalikeURL: `Based on the domain "${domain}" and segment type, suggest a single URL or resource where lookalike companies can be found for this segment.

IMPORTANT: Return ONLY the URL text. No JSON, no explanation, just the URL.

Example format: https://example.com/company-directory`,

    segmentDisqualifying: `Based on the domain "${domain}" and target segment, suggest exactly 4 disqualifying criteria that would indicate a poor fit prospect.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Budget below $50K annually", "No dedicated IT team", "Recent implementation of competing solution", "Not actively looking for solutions in this category"]`,

    problemsWithRootCauses: `Based on the domain "${domain}", description "${cumulativeData.description || ''}", and value proposition "${cumulativeData.valueProposition || ''}", identify exactly 4 specific problems this company solves, including the root causes of each problem.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Problem 1 - Root cause details", "Problem 2 - Root cause details", "Problem 3 - Root cause details", "Problem 4 - Root cause details"]`,

    keyFeatures: `Based on the domain "${domain}", problems solved "${(cumulativeData.problemsWithRootCauses || []).join(', ')}", suggest exactly 4 key product features that would solve these problems.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Feature 1", "Feature 2", "Feature 3", "Feature 4"]`,

    businessOutcomes: `Based on the domain "${domain}", key features "${(cumulativeData.keyFeatures || []).join(', ')}", suggest exactly 4 specific business outcomes with metrics that customers achieve.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["25% increase in efficiency", "50% reduction in processing time", "30% cost savings", "2x faster deployment"]`,

    useCases: `Based on the domain "${domain}", features "${(cumulativeData.keyFeatures || []).join(', ')}", and outcomes "${(cumulativeData.businessOutcomes || []).join(', ')}", suggest exactly 4 specific use cases or scenarios where customers would use this product.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Use case 1", "Use case 2", "Use case 3", "Use case 4"]`,

    uniqueSellingPoints: `Based on the domain "${domain}", features "${(cumulativeData.keyFeatures || []).join(', ')}", and use cases "${(cumulativeData.useCases || []).join(', ')}", suggest exactly 4 unique selling points that differentiate this company from competitors.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["USP 1", "USP 2", "USP 3", "USP 4"]`,

    urgencyConsequences: `Based on the domain "${domain}", problems "${(cumulativeData.problemsWithRootCauses || []).join(', ')}", suggest exactly 4 consequences of NOT solving these problems or delaying implementation.

IMPORTANT: Return ONLY a valid JSON array of exactly 4 strings. No explanation, no markdown, just the JSON array.

Example format: ["Consequence 1", "Consequence 2", "Consequence 3", "Consequence 4"]`
  };

  const prompt = fieldPrompts[fieldType];
  if (!prompt) {
    throw new Error(`Unknown field type: ${fieldType}`);
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No content received from AI');
    }

    // For array fields, try to parse as JSON
    if (['valuePropositionVariations', 'problemsWithRootCauses', 'keyFeatures', 'businessOutcomes', 'useCases', 'uniqueSellingPoints', 'urgencyConsequences', 'pricingTiers', 'clientTimeline', 'roiRequirements', 'segmentName', 'segmentIndustry', 'segmentCompanySize', 'segmentGeography', 'personaTitle', 'personaSeniority', 'personaResponsibilities', 'personaChallenges', 'personaOKRs', 'segmentEmployees', 'segmentLocations', 'segmentSignals', 'segmentBenefits', 'segmentCTA', 'segmentTier1Criteria', 'segmentDisqualifying'].includes(fieldType)) {
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [content];
      } catch (e) {
        // If JSON parsing fails, return as single item array
        console.warn(`Failed to parse JSON for ${fieldType}, treating as single item:`, content);
        return [content];
      }
    }

    // For single value fields, return the content directly
    return content;

  } catch (error) {
    console.error(`Error generating ${fieldType} suggestions:`, error);
    throw error;
  }
}

// New function for step-by-step content generation
function generateStepPrompt(currentStep, formData, companyName) {
  const stepPrompts = {
    1: `Based on the company "${companyName}" and their website "${formData.companyUrl}", suggest 3-5 main products or services they offer. Focus on their core value propositions and what they actually sell. 

IMPORTANT: Return ONLY a valid JSON array of strings. No explanation, no markdown, just the JSON array.

Example format: ["Product 1", "Product 2", "Product 3"]`,
    
    2: `Based on the company "${companyName}" and their products "${formData.products.join(', ')}", suggest 3-5 target buyer personas. These should be decision-makers who would purchase these products. Include job titles and brief descriptions.

IMPORTANT: Return ONLY a valid JSON array of strings. No explanation, no markdown, just the JSON array.

Example format: ["VP of Engineering", "Marketing Director", "Sales Manager"]`,
    
    3: `Based on the company "${companyName}", their products "${formData.products.join(', ')}", and target personas "${formData.personas.join(', ')}", suggest 3-5 specific use cases or scenarios where customers would use these products.

IMPORTANT: Return ONLY a valid JSON array of strings. No explanation, no markdown, just the JSON array.

Example format: ["Use case 1", "Use case 2", "Use case 3"]`,
    
    4: `Based on the company "${companyName}", their products "${formData.products.join(', ')}", and use cases "${formData.useCases.join(', ')}", write a compelling differentiation statement. What makes this company unique? What's their competitive advantage?

IMPORTANT: Return ONLY a single string. No explanation, no markdown, just the string.

Example format: "Our unique value proposition is..."`,
    
    5: `Based on the company "${companyName}", their products "${formData.products.join(', ')}", and differentiation "${formData.differentiation}", suggest 3-5 market segments they should target. Consider industry, company size, geography, etc.

IMPORTANT: Return ONLY a valid JSON array of strings. No explanation, no markdown, just the JSON array.

Example format: ["Segment 1", "Segment 2", "Segment 3"]`,
    
    6: `Based on the company "${companyName}", their products "${formData.products.join(', ')}", and market segments "${formData.segments.join(', ')}", suggest 3-5 direct competitors. Include both company names and their websites.

IMPORTANT: Return ONLY a valid JSON array of objects with "name" and "url" properties. No explanation, no markdown, just the JSON array.

Example format: [{"name": "Competitor 1", "url": "https://competitor1.com"}, {"name": "Competitor 2", "url": "https://competitor2.com"}]`
  };

  return stepPrompts[currentStep] || '';
}

async function generateStepContent(currentStep, formData, companyName) {
  try {
    const prompt = generateStepPrompt(currentStep, formData, companyName);
    
    if (!prompt) {
      return { success: false, error: 'Invalid step' };
    }



    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    

    
    if (!data?.choices?.[0]?.message?.content) {
      console.error('No content in Groq response:', data);
      return { success: false, error: 'No response from Groq' };
    }

    const responseText = data.choices[0].message.content.trim();

    if (currentStep === 4) {
      // Step 4 expects a plain string, not JSON
      return { success: true, suggestions: responseText };
    }

    try {
      // Try to parse as JSON for all other steps
      const suggestions = JSON.parse(responseText);
      return { success: true, suggestions };
    } catch (err) {
      // Try to extract JSON from the response if possible
      const jsonMatch = responseText.match(/\[.*\]/);
      if (jsonMatch) {
        try {
          const suggestions = JSON.parse(jsonMatch[0]);
          return { success: true, suggestions };
        } catch (extractErr) {
          // ignore
        }
      }
      // If parsing fails, return an empty array for non-string steps
      return { success: true, suggestions: [] };
    }
  } catch (error) {
    console.error('Claude step generation error:', error);
    return { success: false, error: error.message };
  }
}

// Generate detailed persona information
async function generatePersonaDetails(personaTitle, companyData) {
  const prompt = `You are a senior GTM strategist. Based on the persona "${personaTitle}" and the company context below, generate detailed persona information.

Company: ${companyData.companyName}
Products: ${companyData.products ? companyData.products.join(', ') : 'N/A'}
Industry: Technology/Engineering Education

Generate comprehensive persona details including:
- Pain points (up to 4 specific challenges)
- Goals and objectives (up to 4 items)
- Daily responsibilities (up to 4 items)
- Key challenges they face (up to 4 items)
- Preferred communication channels (up to 4)
- Decision-making triggers (up to 4)
- Objections they might have (up to 4)
- Demographics and profile information

Return ONLY valid JSON with these exact fields:
{
  "painPoints": [],
  "goals": [],
  "responsibilities": [],
  "challenges": [],
  "channels": [],
  "triggers": [],
  "objections": [],
  "demographics": {
    "experience": "",
    "education": "",
    "industry": "",
    "teamSize": "",
    "budget": ""
  }
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const responseText = data?.choices?.[0]?.message?.content || '{}';
    try {
      let parsed = JSON.parse(responseText);
      // Truncate all arrays to 4 items
      parsed.painPoints = (parsed.painPoints || []).slice(0, 4);
      parsed.goals = (parsed.goals || []).slice(0, 4);
      parsed.responsibilities = (parsed.responsibilities || []).slice(0, 4);
      parsed.challenges = (parsed.challenges || []).slice(0, 4);
      parsed.channels = (parsed.channels || []).slice(0, 4);
      parsed.triggers = (parsed.triggers || []).slice(0, 4);
      parsed.objections = (parsed.objections || []).slice(0, 4);
      return { success: true, data: parsed };
    } catch (parseError) {
      return { success: false, error: 'Failed to parse Claude response' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate detailed segment information
async function generateSegmentDetails(segmentDescription, companyData) {
  const prompt = `You are a senior GTM strategist. Based on the segment "${segmentDescription}" and the company context below, generate detailed segment analysis.

Company: ${companyData.companyName}
Products: ${companyData.products ? companyData.products.join(', ') : 'N/A'}
Industry: Technology/Engineering Education

Generate comprehensive segment details including:
- Key characteristics and firmographics (up to 4)
- Specific pain points this segment faces (up to 4)
- Market size and growth potential
- Buying behavior patterns (up to 4 for each array)
- Qualification criteria (up to 4 for each array)
- Competitive landscape
- Success metrics and KPIs

Return ONLY valid JSON with these exact fields:
{
  "characteristics": [],
  "painPoints": [],
  "marketSize": "",
  "growthRate": "",
  "buyingBehavior": {
    "decisionTimeframe": "",
    "budgetRange": "",
    "decisionMakers": [],
    "evaluationCriteria": []
  },
  "qualification": {
    "idealCriteria": [],
    "disqualifyingCriteria": [],
    "lookalikeCompanies": []
  }
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const responseText = data?.choices?.[0]?.message?.content || '{}';
    try {
      let parsed = JSON.parse(responseText);
      // Truncate all arrays to 4 items
      parsed.characteristics = (parsed.characteristics || []).slice(0, 4);
      parsed.painPoints = (parsed.painPoints || []).slice(0, 4);
      if (parsed.buyingBehavior) {
        parsed.buyingBehavior.decisionMakers = (parsed.buyingBehavior.decisionMakers || []).slice(0, 4);
        parsed.buyingBehavior.evaluationCriteria = (parsed.buyingBehavior.evaluationCriteria || []).slice(0, 4);
      }
      if (parsed.qualification) {
        parsed.qualification.idealCriteria = (parsed.qualification.idealCriteria || []).slice(0, 4);
        parsed.qualification.disqualifyingCriteria = (parsed.qualification.disqualifyingCriteria || []).slice(0, 4);
        parsed.qualification.lookalikeCompanies = (parsed.qualification.lookalikeCompanies || []).slice(0, 4);
      }
      return { success: true, data: parsed };
    } catch (parseError) {
      return { success: false, error: 'Failed to parse Claude response' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate detailed product information
async function generateProductDetails(productName, companyData) {
  const prompt = `You are a senior GTM strategist. Based on the product "${productName}" and the company context below, generate detailed product information.

Company: ${companyData.companyName}
Product: ${productName}
Industry: Technology/Engineering Education

Generate comprehensive product details including:
- Key features and capabilities (up to 4)
- Problems it solves (up to 4)
- Unique selling propositions (up to 4)
- Target use cases (up to 4)
- Benefits and value props (up to 4)
- Competitive advantages (up to 4)
- Implementation considerations (up to 4 for each array)

Return ONLY valid JSON with these exact fields:
{
  "features": [],
  "problems": [],
  "usps": [],
  "useCases": [],
  "benefits": [],
  "competitiveAdvantages": [],
  "implementation": {
    "timeToValue": "",
    "complexity": "",
    "requirements": [],
    "successFactors": []
  }
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const responseText = data?.choices?.[0]?.message?.content || '{}';
    try {
      let parsed = JSON.parse(responseText);
      // Truncate all arrays to 4 items
      parsed.features = (parsed.features || []).slice(0, 4);
      parsed.problems = (parsed.problems || []).slice(0, 4);
      parsed.usps = (parsed.usps || []).slice(0, 4);
      parsed.useCases = (parsed.useCases || []).slice(0, 4);
      parsed.benefits = (parsed.benefits || []).slice(0, 4);
      parsed.competitiveAdvantages = (parsed.competitiveAdvantages || []).slice(0, 4);
      if (parsed.implementation) {
        parsed.implementation.requirements = (parsed.implementation.requirements || []).slice(0, 4);
        parsed.implementation.successFactors = (parsed.implementation.successFactors || []).slice(0, 4);
      }
      return { success: true, data: parsed };
    } catch (parseError) {
      return { success: false, error: 'Failed to parse Claude response' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// New function to refine and improve user input before saving to database
async function refineUserInput(inputType, userInput, context = {}) {
  const refinementPrompts = {
    productName: `Refine this product name to be more professional and market-ready: "${userInput}". Consider the company context: ${context.companyName || 'N/A'}, domain: ${context.domain || 'N/A'}. 

Return ONLY the refined product name. No explanation, no quotes, just the improved name.`,

    productDescription: `Improve this product description to be more compelling and professional: "${userInput}". 

Context: Company: ${context.companyName || 'N/A'}, Domain: ${context.domain || 'N/A'}

Make it:
- Clear and concise (2-3 sentences max)
- Professional and engaging
- Value-focused
- Free of jargon

Return ONLY the improved description. No explanation, just the refined text.`,

    valueProposition: `Refine this value proposition to be more compelling and specific: "${userInput}"

Context: Company: ${context.companyName || 'N/A'}, Product: ${context.productName || 'N/A'}

Make it:
- Clear and specific
- Benefit-focused (not feature-focused)
- Quantifiable where possible
- 30-50 words max

Return ONLY the refined value proposition. No explanation, just the improved text.`,

    personaName: `Improve this persona name/title to be more professional and specific: "${userInput}"

Context: Industry: ${context.industry || 'N/A'}, Company Size: ${context.companySize || 'N/A'}

Make it:
- Professional job title format
- Specific and accurate
- Industry-appropriate

Return ONLY the refined persona name. No explanation, just the improved title.`,

    segmentName: `Refine this market segment name to be more descriptive and professional: "${userInput}"

Context: Company: ${context.companyName || 'N/A'}, Industry: ${context.industry || 'N/A'}

Make it:
- Descriptive and specific
- Include relevant firmographics (size, industry, etc.)
- Professional format

Return ONLY the refined segment name. No explanation, just the improved name.`,

    useCaseDescription: `Improve this use case description to be more specific and actionable: "${userInput}"

Context: Product: ${context.productName || 'N/A'}, Target: ${context.targetAudience || 'N/A'}

Make it:
- Specific and actionable
- Include the problem, solution, and outcome
- Customer-focused language
- 1-2 sentences

Return ONLY the improved use case. No explanation, just the refined text.`,

    painPoint: `Refine this pain point to be more specific and compelling: "${userInput}"

Context: Persona: ${context.personaTitle || 'N/A'}, Industry: ${context.industry || 'N/A'}

Make it:
- Specific and concrete
- Business-impact focused
- Relatable to the target persona
- Quantifiable where possible

Return ONLY the refined pain point. No explanation, just the improved text.`,

    goal: `Improve this goal statement to be more specific and measurable: "${userInput}"

Context: Persona: ${context.personaTitle || 'N/A'}, Company Type: ${context.companyType || 'N/A'}

Make it:
- Specific and measurable
- Business-outcome focused
- Achievable and realistic
- Time-bound where appropriate

Return ONLY the refined goal. No explanation, just the improved text.`,

    responsibility: `Refine this responsibility to be more specific and professional: "${userInput}"

Context: Role: ${context.personaTitle || 'N/A'}, Department: ${context.department || 'N/A'}

Make it:
- Specific and actionable
- Professional language
- Role-appropriate
- Clear scope and impact

Return ONLY the refined responsibility. No explanation, just the improved text.`,

    challenge: `Improve this challenge description to be more specific and impactful: "${userInput}"

Context: Role: ${context.personaTitle || 'N/A'}, Industry: ${context.industry || 'N/A'}

Make it:
- Specific and concrete
- Business-impact focused
- Industry-relevant
- Solution-oriented (what they need to overcome it)

Return ONLY the refined challenge. No explanation, just the improved text.`,

    feature: `Refine this product feature to be more customer-benefit focused: "${userInput}"

Context: Product: ${context.productName || 'N/A'}, Target Users: ${context.targetUsers || 'N/A'}

Make it:
- Benefit-focused (what it enables, not just what it does)
- Customer-centric language
- Clear value delivery
- Concise and specific

Return ONLY the refined feature. No explanation, just the improved text.`,

    differentiation: `Improve this differentiation statement to be more compelling and specific: "${userInput}"

Context: Company: ${context.companyName || 'N/A'}, Competitors: ${context.competitors || 'N/A'}

Make it:
- Specific and unique
- Benefit-focused
- Competitive advantage clear
- Credible and defensible
- 2-3 sentences max

Return ONLY the refined differentiation. No explanation, just the improved text.`,

    objection: `Refine this objection to be more realistic and specific: "${userInput}"

Context: Persona: ${context.personaTitle || 'N/A'}, Product: ${context.productName || 'N/A'}

Make it:
- Realistic and common
- Specific to the persona/situation
- Business-focused (budget, time, resources, etc.)
- Addressable with proper response

Return ONLY the refined objection. No explanation, just the improved text.`,

    competitorAnalysis: `Improve this competitor analysis to be more strategic and actionable: "${userInput}"

Context: Our Company: ${context.companyName || 'N/A'}, Market: ${context.market || 'N/A'}

Make it:
- Specific competitive advantages/disadvantages
- Strategic insights
- Actionable for sales/marketing
- Fact-based and objective

Return ONLY the refined analysis. No explanation, just the improved text.`,

    caseStudy: `Enhance this case study description to be more compelling and specific: "${userInput}"

Context: Product: ${context.productName || 'N/A'}, Industry: ${context.industry || 'N/A'}

Make it:
- Specific customer and situation
- Clear problem, solution, results
- Quantified outcomes where possible
- Credible and detailed

Return ONLY the refined case study. No explanation, just the improved text.`,

    testimonial: `Improve this testimonial to be more credible and impactful: "${userInput}"

Context: Customer Type: ${context.customerType || 'N/A'}, Use Case: ${context.useCase || 'N/A'}

Make it:
- Specific and detailed
- Credible language (not overly promotional)
- Include specific benefits/results
- Attribution-ready format

Return ONLY the refined testimonial. No explanation, just the improved text.`,

    callToAction: `Refine this call-to-action to be more compelling and specific: "${userInput}"

Context: Target: ${context.targetAudience || 'N/A'}, Stage: ${context.buyingStage || 'N/A'}

Make it:
- Action-oriented and specific
- Value-focused
- Urgency where appropriate
- Clear next step

Return ONLY the refined CTA. No explanation, just the improved text.`,

    // Batch refinement for arrays
    batchTextArray: `Improve this list of items to be more professional, specific, and consistent:

${Array.isArray(userInput) ? userInput.map((item, i) => `${i + 1}. ${item}`).join('\n') : userInput}

Context: Type: ${context.itemType || 'N/A'}, Domain: ${context.domain || 'N/A'}

Make each item:
- Professional and specific
- Consistent in tone and format
- Value-focused where appropriate
- Clear and actionable

Return ONLY a JSON array of the improved items. No explanation, no markdown, just the JSON array.`
  };

  const prompt = refinementPrompts[inputType];
  if (!prompt) {
    console.warn(`No refinement prompt found for type: ${inputType}`);
    return { success: true, data: userInput }; // Return original if no refinement available
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for more consistent refinement
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.warn(`No content received for refinement of ${inputType}`);
      return { success: true, data: userInput }; // Return original
    }

    // For array types, try to parse JSON
    if (inputType === 'batchTextArray') {
      try {
        const parsed = JSON.parse(content);
        return { success: true, data: Array.isArray(parsed) ? parsed : [content] };
      } catch (e) {
        console.warn(`Failed to parse array refinement for ${inputType}:`, content);
        return { success: true, data: Array.isArray(userInput) ? userInput : [userInput] };
      }
    }

    // For single values, return the refined content
    return { success: true, data: content };

  } catch (error) {
    console.error(`Error refining ${inputType}:`, error);
    return { success: true, data: userInput }; // Return original on error
  }
}

// Helper function to refine complex objects with multiple fields
async function refineComplexObject(objectType, inputObject, context = {}) {
  const refinementMappings = {
    product: {
      name: 'productName',
      description: 'productDescription',
      valueProposition: 'valueProposition',
      problems: 'batchTextArray',
      features: 'batchTextArray',
      benefits: 'batchTextArray',
      useCases: 'batchTextArray',
      uniqueSellingPoints: 'batchTextArray'
    },
    persona: {
      name: 'personaName',
      title: 'personaName',
      painPoints: 'batchTextArray',
      goals: 'batchTextArray',
      responsibilities: 'batchTextArray',
      challenges: 'batchTextArray',
      objections: 'batchTextArray'
    },
    segment: {
      name: 'segmentName',
      description: 'productDescription',
      characteristics: 'batchTextArray',
      painPoints: 'batchTextArray'
    }
  };

  const fieldMappings = refinementMappings[objectType];
  if (!fieldMappings) {
    return { success: true, data: inputObject };
  }

  const refinedObject = { ...inputObject };
  const refinementPromises = [];

  // Process each field that needs refinement
  for (const [field, refinementType] of Object.entries(fieldMappings)) {
    if (inputObject[field] !== undefined && inputObject[field] !== null && inputObject[field] !== '') {
      const fieldContext = {
        ...context,
        itemType: field,
        [objectType + 'Name']: inputObject.name || inputObject.title
      };

      refinementPromises.push(
        refineUserInput(refinementType, inputObject[field], fieldContext)
          .then(result => ({ field, result }))
      );
    }
  }

  try {
    const results = await Promise.all(refinementPromises);
    
    // Apply refined results
    results.forEach(({ field, result }) => {
      if (result.success) {
        refinedObject[field] = result.data;
      }
    });

    return { success: true, data: refinedObject };
  } catch (error) {
    console.error(`Error refining ${objectType}:`, error);
    return { success: true, data: inputObject };
  }
}

module.exports = {
  callClaudeForICP,
  generateStepContent,
  generatePersonaDetails,
  generateSegmentDetails,
  generateProductDetails,
  generateProductFieldSuggestions,
  refineUserInput,
  refineComplexObject
};

