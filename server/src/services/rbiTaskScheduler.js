import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dbClient from '../config/dbClient.js';
import { generateTasksFromRbiUpdate } from '../helpers/taskGemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STRUCTURED_DIR = path.resolve(__dirname, '../structured');

const CRON_TIME_ZONE = process.env.TASK_CRON_TIMEZONE || 'Asia/Kolkata';
const TASK_STATUSES = new Set(['pending', 'in_progress', 'completed']);

let schedulerInterval = null;
let schedulerActive = false;
let lastCronRunDateKey = null;

function stableHash(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeObligations(doc) {
  const raw = [];

  if (Array.isArray(doc?.obligations)) {
    raw.push(
      ...doc.obligations
        .map((item) => item?.plain_english || item?.summary || item?.text || '')
        .filter(Boolean),
    );
  }

  if (Array.isArray(doc?.prohibitions)) {
    raw.push(
      ...doc.prohibitions
        .map((item) => item?.plain_english || item?.summary || item?.text || '')
        .filter(Boolean),
    );
  }

  if (Array.isArray(doc?.clauses)) {
    raw.push(
      ...doc.clauses
        .filter((clause) => {
          const t = String(clause?.type || '').toLowerCase();
          return t.includes('obligation') || t.includes('prohibition');
        })
        .map((clause) => clause?.summary || clause?.text || '')
        .filter(Boolean),
    );
  }

  return [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))].slice(0, 80);
}

function normalizeRuleDocument(doc, sourceFile) {
  const circular = doc?.circular || {};
  const ruleKey = String(circular.id || circular.circular_number || sourceFile).trim();
  const title = String(circular.title || sourceFile).trim();
  const sourceRef = String(circular.circular_number || ruleKey).trim();
  const summary = String(circular.summary || '').trim();
  const date = circular.date || null;
  const obligations = normalizeObligations(doc);

  const hashPayload = JSON.stringify({
    title,
    sourceRef,
    summary,
    date,
    obligations,
  });

  return {
    ruleKey,
    title,
    sourceRef,
    summary,
    date,
    obligations,
    sourceFile,
    hash: stableHash(hashPayload),
  };
}

async function loadStructuredRules() {
  const entries = await fs.readdir(STRUCTURED_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

  const rules = [];

  for (const file of files) {
    const absolutePath = path.join(STRUCTURED_DIR, file.name);
    try {
      const raw = await fs.readFile(absolutePath, 'utf8');
      const parsed = JSON.parse(raw);
      const rule = normalizeRuleDocument(parsed, file.name);
      if (rule.ruleKey) {
        rules.push(rule);
      }
    } catch (error) {
      console.error(`[TaskScheduler] Failed to parse structured file ${file.name}:`, error.message);
    }
  }

  return rules;
}

async function fetchSnapshotsMap() {
  const { data, error } = await dbClient
    .from('rbi_rule_snapshots')
    .select('rule_key, rule_hash');

  if (error) {
    throw error;
  }

  const map = new Map();
  for (const row of data || []) {
    map.set(row.rule_key, row.rule_hash);
  }
  return map;
}

async function upsertSnapshots(rules) {
  if (!rules.length) return;

  const payload = rules.map((rule) => ({
    rule_key: rule.ruleKey,
    rule_title: rule.title,
    source_ref: rule.sourceRef,
    rule_hash: rule.hash,
    last_effective_date: rule.date || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await dbClient
    .from('rbi_rule_snapshots')
    .upsert(payload, { onConflict: 'rule_key' });

  if (error) {
    throw error;
  }
}

function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next;
}

async function fetchAllUserIds() {
  const { data, error } = await dbClient.from('users').select('id');
  if (error) throw error;
  return (data || []).map((row) => row.id).filter(Boolean);
}

function normalizeTaskStatus(status) {
  const s = String(status || 'pending').trim().toLowerCase();
  return TASK_STATUSES.has(s) ? s : 'pending';
}

async function createTasksForRules(updatedRules, trigger = 'cron') {
  if (!updatedRules.length) {
    return { generatedTasks: 0, updatedRulesCount: 0 };
  }

  const userIds = await fetchAllUserIds();
  if (!userIds.length) {
    return { generatedTasks: 0, updatedRulesCount: updatedRules.length };
  }

  let generatedTasks = 0;
  const now = new Date();

  for (const rule of updatedRules) {
    const aiTasks = await generateTasksFromRbiUpdate(rule);
    if (!aiTasks.length) continue;

    const rows = [];
    for (const userId of userIds) {
      for (const aiTask of aiTasks) {
        const dueDate = addDays(now, Number(aiTask.dueInDays) || 30);
        rows.push({
          user_id: userId,
          title: aiTask.title,
          description: aiTask.description,
          status: normalizeTaskStatus(aiTask.status),
          priority: aiTask.priority || 'medium',
          department: aiTask.department || 'Compliance',
          source_rule_key: rule.ruleKey,
          source_circular_ref: rule.sourceRef,
          source_circular_title: rule.title,
          source_hash: rule.hash,
          ai_generated: true,
          meta: {
            trigger,
            rule_date: rule.date,
            source_file: rule.sourceFile,
          },
          due_date: dueDate.toISOString().slice(0, 10),
        });
      }
    }

    if (!rows.length) continue;

    const { error } = await dbClient
      .from('tasks')
      .upsert(rows, {
        onConflict: 'user_id,source_rule_key,source_hash,title',
      });

    if (error) {
      throw error;
    }

    generatedTasks += rows.length;
  }

  return {
    generatedTasks,
    updatedRulesCount: updatedRules.length,
  };
}

function getTimePartsForZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const read = (type) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

function isMidnight(parts) {
  return parts.hour === '00' && parts.minute === '00';
}

export async function runRbiTaskSync({ force = false, trigger = 'manual' } = {}) {
  const rules = await loadStructuredRules();
  if (!rules.length) {
    return {
      success: true,
      trigger,
      force,
      rulesScanned: 0,
      updatedRulesCount: 0,
      generatedTasks: 0,
      message: 'No structured RBI rules found to scan.',
    };
  }

  const snapshotMap = await fetchSnapshotsMap();

  // First run initializes baseline snapshots to avoid creating a large backlog.
  if (!force && snapshotMap.size === 0) {
    await upsertSnapshots(rules);
    return {
      success: true,
      trigger,
      force,
      rulesScanned: rules.length,
      updatedRulesCount: 0,
      generatedTasks: 0,
      message: 'Baseline snapshots created. Future updates will generate tasks.',
      baselineInitialized: true,
    };
  }

  const updatedRules = force
    ? rules
    : rules.filter((rule) => snapshotMap.get(rule.ruleKey) !== rule.hash);

  if (!updatedRules.length) {
    return {
      success: true,
      trigger,
      force,
      rulesScanned: rules.length,
      updatedRulesCount: 0,
      generatedTasks: 0,
      message: 'No RBI rule updates detected.',
    };
  }

  await upsertSnapshots(updatedRules);
  const taskResult = await createTasksForRules(updatedRules, trigger);

  return {
    success: true,
    trigger,
    force,
    rulesScanned: rules.length,
    updatedRulesCount: taskResult.updatedRulesCount,
    generatedTasks: taskResult.generatedTasks,
    updatedRuleKeys: updatedRules.map((rule) => rule.ruleKey),
    message: `Generated ${taskResult.generatedTasks} task rows from ${taskResult.updatedRulesCount} updated RBI rule(s).`,
  };
}

async function runScheduledSync() {
  if (schedulerActive) return;
  schedulerActive = true;
  try {
    const result = await runRbiTaskSync({ force: false, trigger: 'cron' });
    console.log('[TaskScheduler] Midnight sync result:', result.message);
  } catch (error) {
    console.error('[TaskScheduler] Midnight sync failed:', error.message);
  } finally {
    schedulerActive = false;
  }
}

export function startRbiTaskScheduler() {
  if (schedulerInterval) return;

  const runOnStartup = process.env.TASK_SYNC_ON_STARTUP === 'true';
  if (runOnStartup) {
    runScheduledSync().catch((error) => {
      console.error('[TaskScheduler] Startup sync failed:', error.message);
    });
  }

  schedulerInterval = setInterval(() => {
    const now = new Date();
    const parts = getTimePartsForZone(now, CRON_TIME_ZONE);
    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;

    if (isMidnight(parts) && lastCronRunDateKey !== dateKey) {
      lastCronRunDateKey = dateKey;
      runScheduledSync().catch((error) => {
        console.error('[TaskScheduler] Scheduled sync failed:', error.message);
      });
    }
  }, 60 * 1000);

  console.log(`[TaskScheduler] Started. Midnight sync timezone: ${CRON_TIME_ZONE}`);
}
