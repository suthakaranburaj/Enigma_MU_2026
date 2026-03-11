import { UserProfile } from '../config/mongoModels.js';
import {
  analyzeSkillGap,
  futureSelfChat,
  generateFutureScenarios,
  generateRoadmap,
  predictCareerTrends,
  realityCheck,
} from './aiService.js';

function detectIntent(prompt = '') {
  const text = String(prompt || '').toLowerCase();

  if (/reality\s*check|risk\s*analysis|timeline\s*risk|financial\s*barrier|industry\s*disruption/.test(text)) {
    return 'reality-check';
  }
  if (/career\s*trend|growing\s*career|declining\s*career|job\s*market\s*2035/.test(text)) {
    return 'career-trends';
  }
  if (/skill\s*gap|missing\s*skill|recommended\s*skill|skills?\s+required/.test(text)) {
    return 'skill-gap';
  }
  if (/roadmap|step[-\s]*by[-\s]*step|milestone|plan\s+until\s+2035|path\s+to\s+\d{4}/.test(text)) {
    return 'roadmap';
  }
  if (/future\s*self|my\s+future\s+in\s+2035|from\s+2035|advice\s+for\s+my\s+future/.test(text)) {
    return 'future-chat';
  }
  if (/future\s*simulat|simulate\s+my\s+future|career\s+scenario|career\s+paths?\s+by\s+2035|what\s+.*life\s+look.*2035|if\s+i\s+.*today.*2035|future\s+plan.*2035/.test(text)) {
    return 'future-simulate';
  }

  return null;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

async function resolveProfile(userId, profileOverride = null) {
  if (profileOverride && typeof profileOverride === 'object') {
    return {
      userId: profileOverride.userId ? String(profileOverride.userId).trim() : (userId || null),
      name: String(profileOverride.name || '').trim(),
      education: String(profileOverride.education || '').trim(),
      skills: toStringArray(profileOverride.skills),
      interests: toStringArray(profileOverride.interests),
      careerGoals: String(profileOverride.careerGoals || profileOverride.careerGoal || '').trim(),
      riskTolerance: String(profileOverride.riskTolerance || '').trim(),
      lifestylePreference: String(profileOverride.lifestylePreference || '').trim(),
    };
  }

  if (!userId) return null;
  const profile = await UserProfile.findOne({ userId: String(userId) })
    .sort({ createdAt: -1 })
    .lean();
  if (!profile) return null;

  delete profile._id;
  delete profile.__v;
  return profile;
}

function toJsonBlock(data) {
  try {
    return `\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  } catch (_) {
    return '';
  }
}

function formatIntentResponse(intent, data) {
  switch (intent) {
    case 'future-simulate': {
      const lines = ['Here are 3 possible career paths for 2035:'];
      for (const scenario of data.scenarios || []) {
        lines.push(`- Career: ${scenario.career || 'N/A'}`);
        lines.push(`  Salary Potential: ${scenario.salaryPotential || 'N/A'}`);
        lines.push(`  Required Skills: ${(scenario.requiredSkills || []).join(', ') || 'N/A'}`);
        lines.push(`  Lifestyle: ${scenario.lifestyleImplications || 'N/A'}`);
      }
      return `${lines.join('\n')}${toJsonBlock(data)}`;
    }
    case 'skill-gap':
      return `${[
        'Skill Gap Analysis:',
        `- Missing Skills: ${(data.missingSkills || []).join(', ') || 'None identified'}`,
        `- Recommended Skills: ${(data.recommendedSkills || []).join(', ') || 'None identified'}`,
      ].join('\n')}${toJsonBlock(data)}`;
    case 'roadmap': {
      const lines = [`Roadmap to ${data.careerGoal || 'your goal'} (toward 2035):`];
      for (const step of data.steps || []) {
        lines.push(`- ${step.year || 'Phase'}: ${step.milestone || ''}`);
        if (Array.isArray(step.actions) && step.actions.length) {
          lines.push(`  Actions: ${step.actions.join(', ')}`);
        }
      }
      return `${lines.join('\n')}${toJsonBlock(data)}`;
    }
    case 'future-chat': {
      const text = data.response || 'I could not generate a future-self response right now.';
      return `${text}${toJsonBlock(data)}`;
    }
    case 'career-trends':
      return `${[
        'Career Trends by 2035:',
        `- Growing Careers: ${(data.growingCareers || []).join(', ') || 'N/A'}`,
        `- Declining Careers: ${(data.decliningCareers || []).join(', ') || 'N/A'}`,
      ].join('\n')}${toJsonBlock(data)}`;
    case 'reality-check':
      return `${[
        'Reality Check Results:',
        `- Risks: ${(data.risks || []).join(', ') || 'None identified'}`,
        `- Recommendations: ${(data.recommendations || []).join(', ') || 'No recommendations available'}`,
      ].join('\n')}${toJsonBlock(data)}`;
    default:
      return '';
  }
}

export async function maybeHandleFutureOsIntent({
  prompt,
  userId,
  profileOverride = null,
}) {
  const intent = detectIntent(prompt);
  if (!intent) {
    return { handled: false };
  }

  const profile = await resolveProfile(userId, profileOverride);
  const profileContext = {
    ...(profile || {}),
    userId: profile?.userId || userId || 'anonymous',
    userPrompt: prompt,
  };

  let data;
  switch (intent) {
    case 'future-simulate':
      data = await generateFutureScenarios(profileContext);
      break;
    case 'skill-gap':
      data = await analyzeSkillGap(profileContext);
      break;
    case 'roadmap':
      data = await generateRoadmap(profileContext);
      break;
    case 'future-chat':
      data = await futureSelfChat(prompt, profileContext);
      break;
    case 'career-trends':
      data = await predictCareerTrends();
      break;
    case 'reality-check':
      data = await realityCheck({
        planText: prompt,
        profile: profileContext,
      });
      break;
    default:
      return { handled: false };
  }

  return {
    handled: true,
    intent,
    data,
    content: formatIntentResponse(intent, data),
    metadata: {
      source: 'futureos-intent',
      profileFound: !!profile,
    },
  };
}
