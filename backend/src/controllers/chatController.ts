import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateSquadChartInsight, generateConversationalAIResponse } from '../services/aiService';
import { getSocketIO } from '../sockets/chatSocket';

export const getSquadMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { squadId } = req.params;
    const limit = Number(req.query.limit) || 50;

    const messages = await prisma.message.findMany({
      where: { squadId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        user: true,
        achievement: {
          include: {
            user: true,
            verifications: {
              include: { verifier: true },
            },
          },
        },
      },
    });

    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const clearSquadMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { squadId } = req.params;
    if (!squadId) {
      res.status(400).json({ success: false, error: 'squadId is required' });
      return;
    }

    await prisma.message.deleteMany({
      where: { squadId },
    });

    const io = getSocketIO();
    if (io) {
      io.to(squadId).emit('chat_cleared', { squadId });
    }

    res.json({ success: true, message: 'Chat history cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const postMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { squadId, userId, content } = req.body;

    if (!squadId || !userId || !content) {
      res.status(400).json({ success: false, error: 'squadId, userId, and content are required' });
      return;
    }

    // 1. Create the user's message
    const message = await prisma.message.create({
      data: {
        squadId,
        userId,
        type: 'TEXT',
        content,
      },
      include: {
        user: true,
      },
    });

    const io = getSocketIO();
    if (io) {
      io.to(squadId).emit('new_message', message);
    }

    // 2. Check if the message is triggering the AI Coach (@AI or chart request)
    const lower = content.toLowerCase();
    const isAiQuery = lower.includes('@ai');
    const isChartQuery = lower.includes('/chart') || lower.includes('chart') || lower.includes('graph') || lower.includes('plot');

    if (isAiQuery || isChartQuery) {
      // Gather squad stats to feed into Gemini AI
      const squad = await prisma.squad.findUnique({
        where: { id: squadId },
        include: {
          members: {
            include: {
              user: {
                include: {
                  achievements: {
                    where: { squadId },
                  },
                },
              },
            },
          },
        },
      });

      if (squad) {
        const memberStats = squad.members.map((m) => {
          const user = m.user;
          const achievements = user.achievements || [];
          const totalAchievements = achievements.length;
          const totalScore = achievements.reduce((acc, curr) => acc + (curr.impactScore || 5), 0);
          const avgImpactScore = totalAchievements > 0 ? +(totalScore / totalAchievements).toFixed(1) : 0;

          const categories: Record<string, number> = {};
          achievements.forEach((a) => {
            categories[a.category] = (categories[a.category] || 0) + 1;
          });

          return {
            name: user.name,
            totalAchievements,
            streakDays: user.streakDays,
            avgImpactScore,
            categories,
          };
        });

        const cleanQuery = content.replace(/@ai/gi, '').trim();

        if (isChartQuery) {
          // Generate AI Insight & Chart JSON
          const chartInsight = await generateSquadChartInsight({
            query: cleanQuery || 'Squad Performance',
            squadName: squad.name,
            memberStats,
          });

          const aiMessage = await prisma.message.create({
            data: {
              squadId,
              userId: null, // AI system identity
              type: 'AI_CHART',
              content: `📊 **AI Squad Analytics**: ${chartInsight.coachVerdict}`,
              metadata: chartInsight as any,
            },
          });

          if (io) {
            io.to(squadId).emit('new_message', aiMessage);
          }
        } else {
          // Conversational AI Coach response
          const coachText = await generateConversationalAIResponse({
            query: cleanQuery || 'How is the squad doing?',
            squadName: squad.name,
            authorName: message.user?.name || 'Squad Member',
            memberStats,
          });

          const aiMessage = await prisma.message.create({
            data: {
              squadId,
              userId: null, // AI system identity
              type: 'TEXT',
              content: coachText,
            },
          });

          if (io) {
            io.to(squadId).emit('new_message', aiMessage);
          }
        }
      }
    }

    res.json({ success: true, message });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
