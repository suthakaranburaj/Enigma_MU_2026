import {
  ChatHistory,
  FutureSimulation,
  SkillAnalysis,
  UserProfile,
} from '../config/mongoModels.js';
import {
  analyzeSkillGap,
  futureSelfChat,
  generateCareerRoadmap,
  generateFutureScenarios,
  predictCareerTrends,
  realityCheck as analyzeRealityCheck,
} from '../services/futureAiService.js';

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeProfileInput(body = {}) {
  return {
    userId: body.userId ? String(body.userId).trim() : null,
    name: String(body.name || '').trim(),
    education: String(body.education || '').trim(),
    skills: toStringArray(body.skills),
    interests: toStringArray(body.interests),
    careerGoals: String(body.careerGoals || body.careerGoal || '').trim(),
    riskTolerance: String(body.riskTolerance || '').trim(),
    lifestylePreference: String(body.lifestylePreference || '').trim(),
  };
}

function serializeDoc(doc) {
  const value = doc?.toObject ? doc.toObject() : doc;
  if (!value || typeof value !== 'object') return value;
  delete value._id;
  delete value.__v;
  return value;
}

async function resolveProfileFromRequest(body = {}, fallbackUserId = null) {
  if (body.profile && typeof body.profile === 'object') {
    const normalized = normalizeProfileInput({ ...body.profile, userId: body.profile.userId || fallbackUserId });
    return normalized;
  }

  const profileId = body.profileId ? String(body.profileId).trim() : null;
  if (profileId) {
    const byId = await UserProfile.findOne({ id: profileId }).lean();
    if (byId) {
      delete byId._id;
      delete byId.__v;
      return byId;
    }
  }

  const userId = body.userId ? String(body.userId).trim() : fallbackUserId;
  if (!userId) return null;

  const latest = await UserProfile.findOne({ userId }).sort({ createdAt: -1 }).lean();
  if (!latest) return null;

  delete latest._id;
  delete latest.__v;
  return latest;
}

function sendError(res, error, fallbackMessage = 'Request failed') {
  const statusCode = error?.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: error?.message || fallbackMessage,
  });
}

export async function createProfile(req, res) {
  try {
    const payload = normalizeProfileInput(req.body || {});

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        error: 'name is required',
      });
    }

    const doc = await UserProfile.create(payload);
    return res.status(201).json({
      success: true,
      data: serializeDoc(doc),
    });
  } catch (error) {
    return sendError(res, error, 'Failed to create profile');
  }
}

export async function futureSimulate(req, res) {
  try {
    const fallbackUserId = req.userId || null;
    const profile = await resolveProfileFromRequest(req.body || {}, fallbackUserId);

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Profile is required. Pass `profile`, `profileId`, or `userId` with an existing saved profile.',
      });
    }

    const data = await generateFutureScenarios(profile);
    const simulation = await FutureSimulation.create({
      userId: profile.userId || fallbackUserId || 'anonymous',
      scenarios: data.scenarios,
    });

    return res.json({
      success: true,
      data: {
        simulationId: simulation.id,
        scenarios: data.scenarios,
        sources: Array.isArray(data.sources) ? data.sources : [],
      },
    });
  } catch (error) {
    return sendError(res, error, 'Failed to generate future simulation');
  }
}

export async function skillGap(req, res) {
  try {
    const fallbackUserId = req.userId || null;
    const body = req.body || {};

    const profile =
      (await resolveProfileFromRequest(body, fallbackUserId)) ||
      {
        userId: body.userId || fallbackUserId || 'anonymous',
        skills: toStringArray(body.skills),
      };

    const data = await analyzeSkillGap(profile);
    const analysis = await SkillAnalysis.create({
      userId: profile.userId || 'anonymous',
      currentSkills: data.currentSkills,
      missingSkills: data.missingSkills,
      recommendedSkills: data.recommendedSkills,
    });

    return res.json({
      success: true,
      data: {
        analysisId: analysis.id,
        ...data,
      },
    });
  } catch (error) {
    return sendError(res, error, 'Failed to analyze skill gap');
  }
}

export async function roadmap(req, res) {
  try {
    const fallbackUserId = req.userId || null;
    const body = req.body || {};

    const profile = (await resolveProfileFromRequest(body, fallbackUserId)) || {};
    const careerGoal = String(body.careerGoal || body.careerGoals || profile.careerGoals || '').trim();

    if (!careerGoal) {
      return res.status(400).json({
        success: false,
        error: 'careerGoal is required',
      });
    }

    const data = await generateCareerRoadmap({
      ...profile,
      careerGoals: careerGoal,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Failed to generate roadmap');
  }
}

export async function futureChat(req, res) {
  try {
    const fallbackUserId = req.userId || null;
    const body = req.body || {};
    const message = String(body.message || '').trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
      });
    }

    const profile = (await resolveProfileFromRequest(body, fallbackUserId)) || {};
    const userId = String(body.userId || profile.userId || fallbackUserId || 'anonymous').trim();
    const aiData = await futureSelfChat(message, profile);
    const now = new Date();

    await ChatHistory.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { createdAt: now },
        $push: {
          messages: {
            userMessage: message,
            aiResponse: aiData.response,
            keyAdvice: aiData.keyAdvice,
            nextActions: aiData.nextActions,
            timestamp: now.toISOString(),
          },
        },
      },
      { upsert: true, new: true },
    );

    return res.json({
      success: true,
      data: aiData,
    });
  } catch (error) {
    return sendError(res, error, 'Failed to generate future-self response');
  }
}

export async function careerTrends(req, res) {
  try {
    const data = await predictCareerTrends();
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Failed to predict career trends');
  }
}

export async function realityCheck(req, res) {
  try {
    const body = req.body || {};
    const plan = body.plan ?? body;

    if (!plan || (typeof plan !== 'object' && typeof plan !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'plan is required',
      });
    }

    const data = await analyzeRealityCheck(plan);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Failed to generate reality check');
  }
}
