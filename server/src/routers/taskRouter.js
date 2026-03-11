import express from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import {
  listTasks,
  getTaskStats,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  triggerTaskGeneration,
} from '../controllers/taskController.js';

const router = express.Router();

router.use(authenticate, requireAuth);

router.get('/', listTasks);
router.get('/stats', getTaskStats);
router.post('/', createTask);
router.post('/generate-from-updates', triggerTaskGeneration);
router.patch('/:taskId', updateTask);
router.patch('/:taskId/status', updateTaskStatus);
router.delete('/:taskId', deleteTask);

export default router;
