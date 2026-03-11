import express from 'express';
import {
  careerTrends,
  createProfile,
  futureChat,
  futureSimulate,
  roadmap,
  skillGap,
} from '../controllers/futureOsController.js';

const router = express.Router();

router.post('/profile', createProfile);
router.post('/future-simulate', futureSimulate);
router.post('/skill-gap', skillGap);
router.post('/roadmap', roadmap);
router.post('/future-chat', futureChat);
router.get('/career-trends', careerTrends);

export default router;
