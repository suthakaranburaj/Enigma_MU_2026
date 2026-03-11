import fetch from 'node-fetch';
import env from '../config/env.js';

const TASK_MODEL_ID = 'gemini-2.5-flash-lite';
const TASK_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function extractJsonArray(rawText = '') {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    // no-op
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      const parsed = JSON.parse(fencedMatch[1].trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      // no-op
    }
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      // no-op
    }
  }

  return [];
}

function normalizePriority(priority) {
  const normalized = String(priority || '').toLowerCase().trim();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'low') return 'low';
  return 'medium';
}

function normalizeDueInDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.min(180, Math.max(1, Math.round(n)));
}

function normalizeTaskDraft(task, fallbackDepartment = 'Compliance') {
  const title = String(task?.title || '').trim();
  if (!title) return null;

  const description = String(task?.description || '').trim();
  const department = String(task?.department || fallbackDepartment).trim() || fallbackDepartment;

  return {
    title,
    description: description || 'Review this RBI update and complete the required compliance action.',
    department,
    priority: normalizePriority(task?.priority),
    dueInDays: normalizeDueInDays(task?.dueInDays),
  };
}

function buildFallbackTasks(ruleUpdate) {
  const obligations = Array.isArray(ruleUpdate?.obligations) ? ruleUpdate.obligations : [];
  const first = obligations[0];
  const summary = String(ruleUpdate?.summary || '').trim();
  const title = String(ruleUpdate?.title || 'RBI rule update').trim();

  const fallbackTitle = first
    ? `Comply with RBI update: ${first.slice(0, 80)}${first.length > 80 ? '...' : ''}`
    : `Review and implement changes from ${title}`;

  return [
    {
      title: fallbackTitle,
      description: summary || 'Assess this RBI update and implement the required compliance steps.',
      department: 'Compliance',
      priority: 'critical',
      dueInDays: 14,
    },
  ];
}

export async function generateTasksFromRbiUpdate(ruleUpdate) {
  if (!env.GEMINI_API_KEY3) {
    console.warn('[TaskGemini] GEMINI_API_KEY3 not set. Using fallback task generation.');
    return buildFallbackTasks(ruleUpdate);
  }

  const promptPayload = {
    circularTitle: ruleUpdate?.title || '',
    circularReference: ruleUpdate?.sourceRef || ruleUpdate?.ruleKey || '',
    summary: ruleUpdate?.summary || '',
    effectiveDate: ruleUpdate?.date || '',
    obligations: Array.isArray(ruleUpdate?.obligations) ? ruleUpdate.obligations.slice(0, 30) : [],
  };

  const prompt = [
    'You are a banking compliance task planner.',
    'Generate 3 to 6 actionable compliance tasks for the update below.',
    'Return ONLY a JSON array.',
    'Each object must have: title, description, department, priority, dueInDays.',
    'priority must be one of: low, medium, critical.',
    'dueInDays must be an integer between 1 and 180.',
    'Keep task titles concise and specific.',
    '',
    JSON.stringify(promptPayload, null, 2),
  ].join('\n');

  const url = `${TASK_BASE_URL}/${TASK_MODEL_ID}:generateContent?key=${env.GEMINI_API_KEY3}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gemini task generation failed (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim();

    const parsed = extractJsonArray(text);
    const normalized = parsed
      .map((task) => normalizeTaskDraft(task))
      .filter(Boolean);

    if (normalized.length > 0) {
      return normalized.slice(0, 8);
    }

    console.warn('[TaskGemini] No valid JSON tasks found in Gemini response. Using fallback.');
    return buildFallbackTasks(ruleUpdate);
  } catch (error) {
    console.error('[TaskGemini] Error generating tasks with Gemini:', error.message);
    return buildFallbackTasks(ruleUpdate);
  }
}
