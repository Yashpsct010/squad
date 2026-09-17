import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../config/prisma';
import { evaluateAchievement } from '../services/aiService';
import { getSocketIO } from '../sockets/chatSocket';
import { MAX_TOTAL_BATCH_BYTES } from '../services/uploadService';
import { Category } from '@prisma/client';

export const createAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, squadId, title, description, category, timeSpentMin } = req.body;

    if (!userId || !squadId || !title || !description) {
      res.status(400).json({
        success: false,
        error: 'userId, squadId, title, and description are required.',
      });
      return;
    }

    // Process uploaded media files if any
    const files = req.files as Express.Multer.File[] | undefined;

    // Enforce 50MB combined batch limit
    if (files && files.length > 0) {
      const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
      if (totalBytes > MAX_TOTAL_BATCH_BYTES) {
        // Clean up stored files
        files.forEach((f) => {
          try {
            fs.unlinkSync(f.path);
          } catch {}
        });
        res.status(400).json({
          success: false,
          error: `Total media size exceeds the 50MB limit (${(totalBytes / (1024 * 1024)).toFixed(1)}MB uploaded). Please trim or compress video clips.`,
        });
        return;
      }
    }

    const mediaUrls: string[] = files
      ? files.map((f) => `/uploads/${f.filename}`)
      : [];

    // Fetch user goals for AI context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { goals: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const goalTitles = user.goals.map((g) => g.title);

    // Call Gemini AI evaluation service
    const evaluation = await evaluateAchievement({
      title,
      description,
      category: category || 'DISCIPLINE',
      timeSpentMin: timeSpentMin ? Number(timeSpentMin) : undefined,
      userGoals: goalTitles,
    });

    // Update user streak (increment if active today)
    const now = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt: now,
        streakDays: { increment: 1 },
      },
    });

    // Save achievement in PostgreSQL
    const validCategory = (category in Category ? category : 'DISCIPLINE') as Category;

    const achievement = await prisma.achievement.create({
      data: {
        userId,
        squadId,
        title,
        description,
        category: validCategory,
        timeSpentMin: timeSpentMin ? Number(timeSpentMin) : null,
        mediaUrls,
        impactScore: evaluation.impactScore,
        aiVerdict: evaluation.aiVerdict,
        aiFeedback: evaluation.aiFeedback,
        aiRecommendation: evaluation.aiRecommendation,
        isVanityTask: evaluation.isVanityTask,
      },
      include: {
        user: true,
        verifications: {
          include: { verifier: true },
        },
      },
    });

    // Broadcast achievement card into squad chat via WebSocket
    const io = getSocketIO();
    if (io) {
      const message = await prisma.message.create({
        data: {
          squadId,
          userId,
          type: 'ACHIEVEMENT_CARD',
          content: `${user.name} logged: ${title}`,
          achievementId: achievement.id,
          metadata: {
            achievement,
            streakDays: updatedUser.streakDays,
          },
        },
        include: {
          user: true,
          achievement: true,
        },
      });

      io.to(squadId).emit('new_message', message);
    }

    res.json({
      success: true,
      achievement,
      evaluation,
      streakDays: updatedUser.streakDays,
    });
  } catch (error: any) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { achievementId } = req.params;
    const { verifierId } = req.body;

    if (!verifierId) {
      res.status(400).json({ success: false, error: 'verifierId is required' });
      return;
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      res.status(404).json({ success: false, error: 'Achievement not found' });
      return;
    }

    if (achievement.userId === verifierId) {
      res.status(400).json({ success: false, error: 'You cannot verify your own achievement!' });
      return;
    }

    const verification = await prisma.achievementVerification.create({
      data: {
        achievementId,
        verifierId,
      },
      include: {
        verifier: true,
      },
    });

    const io = getSocketIO();
    if (io) {
      io.to(achievement.squadId).emit('achievement_verified', {
        achievementId,
        verification,
      });
    }

    res.json({ success: true, verification });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getSquadAchievements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { squadId } = req.params;

    const achievements = await prisma.achievement.findMany({
      where: { squadId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        verifications: {
          include: { verifier: true },
        },
      },
    });

    res.json({ success: true, achievements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
