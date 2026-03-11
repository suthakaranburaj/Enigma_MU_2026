import OpenAI from 'openai';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

let cachedClient = null;

function getOpenAIClient() {
  if (cachedClient) return cachedClient;

  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.statusCode = 500;
    throw error;
  }

  cachedClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  return cachedClient;
}

function tryParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  try {
    return JSON.parse(rawText);
  } catch (_) {
    const fenced = rawText.match(/```json\s*([\s\S]*?)```/i) || rawText.match(/```\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

async function requestStructuredJson({ systemPrompt, userPrompt }) {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = completion?.choices?.[0]?.message?.content || '';
  const parsed = tryParseJson(content);

  if (!parsed || typeof parsed !== 'object') {
    const error = new Error('Failed to parse structured JSON from AI response');
    error.statusCode = 502;
    throw error;
  }

  return parsed;
}

function ensureStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export async function generateFutureScenarios(profile) {
  const prompt = [
    "You are a future career prediction AI. Based on the user's profile, generate 3 possible future career paths by the year 2035. Include career title, required skills, salary potential, and lifestyle implications.",
    'Return valid JSON with this shape:',
    '{ "scenarios": [ { "careerTitle": "...", "requiredSkills": ["..."], "salaryPotential": "...", "lifestyleImplications": "..." } ] }',
    `User profile: ${JSON.stringify(profile)}`,
  ].join('\n');

  const json = await requestStructuredJson({
    systemPrompt: 'You are FutureOS simulation intelligence. Always return valid JSON only.',
    userPrompt: prompt,
  });

  const scenarios = Array.isArray(json.scenarios) ? json.scenarios : [];
  return {
    scenarios: scenarios.map((scenario) => ({
      careerTitle: String(scenario?.careerTitle || ''),
      requiredSkills: ensureStringArray(scenario?.requiredSkills),
      salaryPotential: String(scenario?.salaryPotential || ''),
      lifestyleImplications: String(scenario?.lifestyleImplications || ''),
    })),
  };
}

export async function analyzeSkillGap(profile) {
  const prompt = [
    "Analyze the user's current skills and identify missing skills required for future job markets by 2035.",
    'Return valid JSON with this shape:',
    '{ "currentSkills": ["..."], "missingSkills": ["..."], "recommendedSkills": ["..."] }',
    `User profile: ${JSON.stringify(profile)}`,
  ].join('\n');

  const json = await requestStructuredJson({
    systemPrompt: 'You are FutureOS skill-gap analysis intelligence. Always return valid JSON only.',
    userPrompt: prompt,
  });

  return {
    currentSkills: ensureStringArray(json.currentSkills || profile?.skills),
    missingSkills: ensureStringArray(json.missingSkills),
    recommendedSkills: ensureStringArray(json.recommendedSkills),
  };
}

export async function generateCareerRoadmap(profile) {
  const prompt = [
    "Generate a step-by-step roadmap from today until 2035 to reach the user's career goal.",
    'Return valid JSON with this shape:',
    '{ "careerGoal": "...", "steps": [ { "phase": "...", "timeline": "...", "actions": ["..."] } ] }',
    `User profile: ${JSON.stringify(profile)}`,
  ].join('\n');

  const json = await requestStructuredJson({
    systemPrompt: 'You are FutureOS roadmap intelligence. Always return valid JSON only.',
    userPrompt: prompt,
  });

  return {
    careerGoal: String(json.careerGoal || profile?.careerGoals || profile?.careerGoal || ''),
    steps: Array.isArray(json.steps)
      ? json.steps.map((step) => ({
          phase: String(step?.phase || ''),
          timeline: String(step?.timeline || ''),
          actions: ensureStringArray(step?.actions),
        }))
      : [],
  };
}

export async function futureSelfChat(message, profile) {
  const prompt = [
    "You are the user's future self in the year 2035. Provide advice based on predicted career paths and technology trends.",
    'Return valid JSON with this shape:',
    '{ "response": "...", "keyAdvice": ["..."], "nextActions": ["..."] }',
    `User profile: ${JSON.stringify(profile)}`,
    `Message from present self: ${message}`,
  ].join('\n');

  const json = await requestStructuredJson({
    systemPrompt: 'You are FutureOS Future-Self advisor from year 2035. Always return valid JSON only.',
    userPrompt: prompt,
  });

  return {
    response: String(json.response || ''),
    keyAdvice: ensureStringArray(json.keyAdvice),
    nextActions: ensureStringArray(json.nextActions),
  };
}

export async function predictCareerTrends() {
  const prompt = [
    'Predict global and India-relevant career trends up to 2035.',
    'Return valid JSON with this shape:',
    '{ "growingCareers": ["..."], "decliningCareers": ["..."], "summary": "..." }',
  ].join('\n');

  const json = await requestStructuredJson({
    systemPrompt: 'You are FutureOS labor-market trend intelligence. Always return valid JSON only.',
    userPrompt: prompt,
  });

  return {
    growingCareers: ensureStringArray(json.growingCareers),
    decliningCareers: ensureStringArray(json.decliningCareers),
    summary: String(json.summary || ''),
  };
}
