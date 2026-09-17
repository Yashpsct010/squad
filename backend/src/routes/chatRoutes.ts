import { Router } from 'express';
import { getSquadMessages, postMessage, clearSquadMessages } from '../controllers/chatController';

const router = Router();

router.get('/:squadId', getSquadMessages);
router.post('/', postMessage);
router.delete('/:squadId/clear', clearSquadMessages);

export default router;
