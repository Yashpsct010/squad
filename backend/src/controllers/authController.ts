import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  avatarUrl: z.string().optional(),
  goals: z.array(z.string()).optional(),
});

export const registerOrLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = registerSchema.parse(req.body);

    let user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        goals: true,
        memberships: {
          include: { squad: true },
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: validated.email,
          name: validated.name,
          avatarUrl: validated.avatarUrl,
          goals: validated.goals
            ? {
                create: validated.goals.map((title) => ({ title })),
              }
            : undefined,
        },
        include: {
          goals: true,
          memberships: {
            include: { squad: true },
          },
        },
      });
    }

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        goals: true,
        memberships: {
          include: {
            squad: {
              include: {
                members: {
                  include: { user: true },
                },
              },
            },
          },
        },
        achievements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
