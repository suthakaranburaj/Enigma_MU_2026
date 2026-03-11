import fetch from 'node-fetch';

const MODEL_NAME = process.env.FUTUREOS_GEMINI_MODEL || 'gemini-2.5-flash-lite';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function parseJsonFromText(raw) {
  if (!raw || typeof raw !== 'string') return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch (_) {
        return null;
      }
    }
  }
  return null;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

async function fetchPageTitle(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 5000,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim();
    if (title) return title.slice(0, 100);
  } catch (_) {
    // ignore and fallback below
  }

  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch (_) {
    return 'Link';
  }
}

async function processSourcesWithTitles(urls = []) {
  if (!urls.length) return [];
  const seen = new Set();
  const unique = urls.filter((u) => {
    if (!u || seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  const withTitles = await Promise.all(
    unique.map(async (url) => ({
      url,
      title: await fetchPageTitle(url),
    })),
  );
  return withTitles;
}

function extractGroundedUrls(data) {
  const urls = [];
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  for (const candidate of candidates) {
    const chunks = candidate?.groundingMetadata?.groundingChunks;
    if (!Array.isArray(chunks)) continue;
    for (const chunk of chunks) {
      const uri = chunk?.web?.uri;
      if (typeof uri === 'string' && uri.startsWith('http')) {
        urls.push(uri);
      }
    }
  }
  return urls;
}

function extractTextFromGeminiResponse(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  let output = '';
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (typeof part?.text === 'string') output += part.text;
    }
  }
  return output.trim();
}

async function generateGroundedJson(prompt, fallbackMessage = 'AI response was not valid JSON') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured');
    error.statusCode = 500;
    throw error;
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
    tools: [{ google_search: {} }],
  };

  const url = `${BASE_URL}/${MODEL_NAME}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Gemini request failed (${response.status})`;
    const error = new Error(message);
    error.statusCode = response.status || 500;
    throw error;
  }

  const rawText = extractTextFromGeminiResponse(data);
  const parsed = parseJsonFromText(rawText);
  if (!parsed || typeof parsed !== 'object') {
    const error = new Error(fallbackMessage);
    error.statusCode = 502;
    throw error;
  }

  const urls = extractGroundedUrls(data);
  const sources = await processSourcesWithTitles(urls);

  return { json: parsed, sources };
}

export async function generateFutureScenarios(profile) {
  const prompt = [
    'You are FutureOS simulation intelligence.',
    'Use web-grounded facts and realistic assumptions.',
    'Generate 3 possible career paths for the user by the year 2035.',
    'Include: career, salary potential, required skills, lifestyle implications.',
    'Return JSON only with format:',
    '{ "scenarios": [ { "career": "...", "salaryPotential": "...", "requiredSkills": ["..."], "lifestyleImplications": "..." } ] }',
    `User profile: ${JSON.stringify(profile)}`,
  ].join('\n');

  const { json, sources } = await generateGroundedJson(prompt);
  return {
    scenarios: Array.isArray(json.scenarios)
      ? json.scenarios.map((item) => ({
          career: String(item?.career || ''),
          salaryPotential: String(item?.salaryPotential || ''),
          requiredSkills: toStringArray(item?.requiredSkills),
          lifestyleImplications: String(item?.lifestyleImplications || ''),
        }))
      : [],
    sources,
  };
}

export async function analyzeSkillGap(profile) {
  const prompt = [
    'You are FutureOS skill-gap analyst.',
    'Use web-grounded trends for 2035 careers and skills.',
    'Analyze missing skills required for future careers.',
    'Return JSON only in this format:',
    '{ "missingSkills": ["..."], "recommendedSkills": ["..."] }',
    `User profile: ${JSON.stringify(profile)}`,
  ].join('\n');

  const { json, sources } = await generateGroundedJson(prompt);
  return {
    currentSkills: toStringArray(profile?.skills),
    missingSkills: toStringArray(json.missingSkills),
    recommendedSkills: toStringArray(json.recommendedSkills),
    sources,
  };
}

export async function generateRoadmap(profile) {
  const prompt = [
    'You are FutureOS roadmap planner.',
    'Use web-grounded information and realistic market timeline assumptions.',
    'Generate a step-by-step roadmap from today until 2035.',
    'Return JSON only in this format:',
    '{ "careerGoal": "...", "steps": [ { "year": "YYYY", "milestone": "...", "actions": ["..."] } ] }',
    `User profile: ${JSON.stringify(profile)}`,
  ].join('\n');

  const { json, sources } = await generateGroundedJson(prompt);
  return {
    careerGoal: String(json.careerGoal || profile?.careerGoals || profile?.careerGoal || ''),
    steps: Array.isArray(json.steps)
      ? json.steps.map((step) => ({
          year: String(step?.year || ''),
          milestone: String(step?.milestone || ''),
          actions: toStringArray(step?.actions),
        }))
      : [],
    sources,
  };
}

export async function futureSelfChat(message, profile) {
  const prompt = [
    "You are the user's future self in 2035 giving advice about their career.",
    'Use web-grounded trends and provide realistic recommendations.',
    'Return JSON only in this format:',
    '{ "response": "...", "keyAdvice": ["..."], "nextActions": ["..."] }',
    `User profile: ${JSON.stringify(profile)}`,
    `User message: ${message}`,
  ].join('\n');

  const { json, sources } = await generateGroundedJson(prompt);
  return {
    response: String(json.response || ''),
    keyAdvice: toStringArray(json.keyAdvice),
    nextActions: toStringArray(json.nextActions),
    sources,
  };
}

export async function predictCareerTrends() {
  const prompt = [
    'You are FutureOS career trend analyst.',
    'List growing and declining careers by 2035 using web-grounded insights.',
    'Return JSON only in this format:',
    '{ "growingCareers": ["..."], "decliningCareers": ["..."], "summary": "..." }',
  ].join('\n');

  const { json, sources } = await generateGroundedJson(prompt);
  return {
    growingCareers: toStringArray(json.growingCareers),
    decliningCareers: toStringArray(json.decliningCareers),
    summary: String(json.summary || ''),
    sources,
  };
}

export async function realityCheck(plan) {
  const prompt = [
    'You are an AI risk analysis system.',
    "Analyze the user's future plan and identify potential failures, risks, and challenges.",
    'Focus on: market competition, missing skills, financial barriers, industry disruption, timeline risks.',
    'Use web-grounded evidence.',
    'Return JSON only in this format:',
    '{ "risks": ["..."], "recommendations": ["..."] }',
    `User plan: ${JSON.stringify(plan)}`,
  ].join('\n');

  const { json, sources } = await generateGroundedJson(prompt);
  return {
    risks: toStringArray(json.risks),
    recommendations: toStringArray(json.recommendations),
    sources,
  };
}
