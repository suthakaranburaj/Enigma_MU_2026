import dbClient from '../config/dbClient.js';
import { runRbiTaskSync } from '../services/rbiTaskScheduler.js';

const ALLOWED_STATUSES = new Set(['pending', 'in_progress', 'completed']);
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'critical']);

function normalizeStatus(value, fallback = 'pending') {
  const status = String(value || '').toLowerCase().trim();
  return ALLOWED_STATUSES.has(status) ? status : fallback;
}

function normalizePriority(value, fallback = 'medium') {
  const priority = String(value || '').toLowerCase().trim();
  return ALLOWED_PRIORITIES.has(priority) ? priority : fallback;
}

export async function listTasks(req, res) {
  try {
    const userId = req.userId;
    const requestedStatus = req.query?.status;
    const status = requestedStatus ? normalizeStatus(requestedStatus, 'all') : 'all';

    let query = dbClient
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status !== 'all' && ALLOWED_STATUSES.has(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      status: 'success',
      data: {
        tasks: data || [],
      },
    });
  } catch (error) {
    console.error('[Tasks] listTasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

export async function getTaskStats(req, res) {
  try {
    const userId = req.userId;
    const { data, error } = await dbClient
      .from('tasks')
      .select('id, status')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const stats = {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
    };

    for (const task of data || []) {
      stats.total += 1;
      const normalized = normalizeStatus(task.status);
      stats[normalized] += 1;
    }

    return res.json({ status: 'success', data: stats });
  } catch (error) {
    console.error('[Tasks] getTaskStats error:', error);
    return res.status(500).json({ error: 'Failed to fetch task stats' });
  }
}

export async function createTask(req, res) {
  try {
    const userId = req.userId;
    const {
      title,
      description = '',
      department = 'Compliance',
      priority = 'medium',
      dueDate = null,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const payload = {
      user_id: userId,
      title: String(title).trim(),
      description: String(description || '').trim(),
      department: String(department || 'Compliance').trim(),
      priority: normalizePriority(priority),
      status: 'pending',
      due_date: dueDate || null,
      ai_generated: false,
      meta: { source: 'manual' },
    };

    const { data, error } = await dbClient
      .from('tasks')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ status: 'success', data: { task: data } });
  } catch (error) {
    console.error('[Tasks] createTask error:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function updateTask(req, res) {
  try {
    const userId = req.userId;
    const { taskId } = req.params;
    const {
      title,
      description,
      department,
      priority,
      dueDate,
    } = req.body || {};

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const patch = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) patch.title = String(title || '').trim();
    if (description !== undefined) patch.description = String(description || '').trim();
    if (department !== undefined) patch.department = String(department || '').trim();
    if (priority !== undefined) patch.priority = normalizePriority(priority);
    if (dueDate !== undefined) patch.due_date = dueDate || null;

    const { data, error } = await dbClient
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ status: 'success', data: { task: data } });
  } catch (error) {
    console.error('[Tasks] updateTask error:', error);
    return res.status(500).json({ error: 'Failed to update task' });
  }
}

export async function updateTaskStatus(req, res) {
  try {
    const userId = req.userId;
    const { taskId } = req.params;
    const status = normalizeStatus(req.body?.status);

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const patch = {
      status,
      updated_at: new Date().toISOString(),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    };

    const { data, error } = await dbClient
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ status: 'success', data: { task: data } });
  } catch (error) {
    console.error('[Tasks] updateTaskStatus error:', error);
    return res.status(500).json({ error: 'Failed to update task status' });
  }
}

export async function deleteTask(req, res) {
  try {
    const userId = req.userId;
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const { error } = await dbClient
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ status: 'success' });
  } catch (error) {
    console.error('[Tasks] deleteTask error:', error);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
}

export async function triggerTaskGeneration(req, res) {
  try {
    const force = req.body?.force === true;
    const result = await runRbiTaskSync({ force, trigger: 'manual' });
    return res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[Tasks] triggerTaskGeneration error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate tasks from RBI updates',
    });
  }
}
