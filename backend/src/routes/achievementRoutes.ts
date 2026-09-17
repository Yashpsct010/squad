import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  createAchievement,
  verifyAchievement,
  getSquadAchievements,
} from '../controllers/achievementController';
import { upload } from '../services/uploadService';

const router = Router();

// Handle multer upload with custom error handling
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.array('media', 5)(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          error: 'An individual media file exceeds the 20MB limit. Total post limit is 50MB.',
        });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({
          success: false,
          error: 'Maximum 5 photos or videos allowed per achievement.',
        });
        return;
      }
      res.status(400).json({ success: false, error: err.message });
      return;
    } else if (err) {
      res.status(400).json({ success: false, error: err.message || 'File upload failed.' });
      return;
    }
    next();
  });
};

// Post an achievement with up to 5 photos/videos (max 50MB total)
router.post('/', handleUpload, createAchievement);

// Peer verification ("Verified by Squad")
router.post('/:achievementId/verify', verifyAchievement);

// Get achievements for a squad
router.get('/squad/:squadId', getSquadAchievements);

export default router;
