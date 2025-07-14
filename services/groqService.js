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
  generateProductDetails
};

