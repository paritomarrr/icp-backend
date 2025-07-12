// services/claudeService.js
const fetch = require('node-fetch');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

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

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await res.json();

      try {
        return JSON.parse(data?.content?.[0]?.text || '{}');
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

module.exports = {
  callClaudeForICP
};
