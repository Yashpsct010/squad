import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const createSquadSchema = z.object({
  name: z.string().min(2),
  creatorUserId: z.string().uuid(),
  maxMembers: z.number().default(3),
});

const joinSquadSchema = z.object({
  inviteCode: z.string().min(4),
  userId: z.string().uuid(),
});

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const createSquad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, creatorUserId, maxMembers } = createSquadSchema.parse(req.body);

    const squad = await prisma.squad.create({
      data: {
        name,
        inviteCode: generateInviteCode(),
        maxMembers,
        members: {
          create: {
            userId: creatorUserId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    res.json({ success: true, squad });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const joinSquad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inviteCode, userId } = joinSquadSchema.parse(req.body);

    const squad = await prisma.squad.findUnique({
      where: { inviteCode },
      include: { members: true },
    });

    if (!squad) {
      res.status(404).json({ success: false, error: 'Squad not found with this code' });
      return;
    }

    if (squad.members.length >= squad.maxMembers) {
      res.status(400).json({
        success: false,
        error: `Squad is full! Maximum limit of ${squad.maxMembers} members reached.`,
      });
      return;
    }

    const alreadyMember = squad.members.some((m) => m.userId === userId);
    if (alreadyMember) {
      res.status(400).json({ success: false, error: 'Already a member of this squad' });
      return;
    }

    const membership = await prisma.squadMember.create({
      data: {
        squadId: squad.id,
        userId,
        role: 'MEMBER',
      },
      include: { squad: true, user: true },
    });

    res.json({ success: true, membership });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getSquadDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { squadId } = req.params;

    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      include: {
        members: {
          include: {
            user: {
              include: {
                goals: true,
                achievements: {
                  include: {
                    verifications: true,
                  },
                },
              },
            },
          },
        },
        achievements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: true,
            verifications: {
              include: { verifier: true },
            },
          },
        },
      },
    });

    if (!squad) {
      res.status(404).json({ success: false, error: 'Squad not found' });
      return;
    }

    res.json({ success: true, squad });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const leaveSquad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { squadId, userId } = req.body;
    if (!squadId || !userId) {
      res.status(400).json({ success: false, error: 'squadId and userId are required' });
      return;
    }

    await prisma.squadMember.deleteMany({
      where: {
        squadId,
        userId,
      },
    });

    res.json({ success: true, message: 'Left squad successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
