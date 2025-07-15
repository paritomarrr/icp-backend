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
    if (['valuePropositionVariations', 'problemsWithRootCauses', 'keyFeatures', 'businessOutcomes', 'useCases', 'uniqueSellingPoints', 'urgencyConsequences', 'pricingTiers', 'clientTimeline', 'roiRequirements', 'segmentName', 'segmentIndustry', 'segmentCompanySize', 'segmentGeography', 'personaTitle', 'personaSeniority', 'personaResponsibilities', 'personaChallenges'].includes(fieldType)) {
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

module.exports = {
  callClaudeForICP,
  generateStepContent,
  generatePersonaDetails,
  generateSegmentDetails,
  generateProductDetails,
  generateProductFieldSuggestions
};

