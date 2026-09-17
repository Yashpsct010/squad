import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generatePersonalCoachInsight } from '../services/aiService';

export const getPersonalCoachAdvice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, squadId, question } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        goals: true,
        achievements: {
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const userGoals = user.goals.map((g) => g.title);
    const achievementsData = user.achievements.map((a) => ({
      title: a.title,
      category: a.category,
      impactScore: a.impactScore ?? 6,
      isVanityTask: a.isVanityTask,
      createdAt: a.createdAt,
    }));

    const coachResult = await generatePersonalCoachInsight({
      userName: user.name,
      userGoals,
      streakDays: user.streakDays,
      achievements: achievementsData,
      question: question || 'How is my overall discipline and consistency trending?',
    });

    res.json({
      success: true,
      answer: coachResult.answer,
      strengthHighlight: coachResult.strengthHighlight,
      nextFocusArea: coachResult.nextFocusArea,
      streakDays: user.streakDays,
      totalAchievements: user.achievements.length,
    });
  } catch (error: any) {
    console.error('Personal coach error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
