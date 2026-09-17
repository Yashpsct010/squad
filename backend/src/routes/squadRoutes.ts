import { Router } from 'express';
import { createSquad, joinSquad, getSquadDetails, leaveSquad } from '../controllers/squadController';

const router = Router();

router.post('/create', createSquad);
router.post('/join', joinSquad);
router.post('/leave', leaveSquad);
router.get('/:squadId', getSquadDetails);

export default router;
