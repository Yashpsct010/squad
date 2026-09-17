import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AchievementEvaluation {
  impactScore: number; // 1 - 10
  aiVerdict: string;
  aiFeedback: string;
  aiRecommendation: string;
  isVanityTask: boolean;
}

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartInsight {
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'radar';
  labels: string[];
  datasets: ChartDataset[];
  coachVerdict: string;
  summary: string;
}

const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * AI Accountability Coach: Evaluates a user's posted achievement.
 * Determines real impact vs vanity busywork, provides feedback & impact rating (1-10).
 */
export async function evaluateAchievement(params: {
  title: string;
  description: string;
  category: string;
  timeSpentMin?: number;
  userGoals: string[];
}): Promise<AchievementEvaluation> {
  const genAI = getAIClient();

  if (!genAI) {
    // Fallback heuristic evaluation when GEMINI_API_KEY is not yet populated
    const isShort = params.description.length < 25;
    const score = isShort ? 5 : Math.min(9, Math.max(6, Math.floor((params.description.length / 40) + 5)));
    return {
      impactScore: score,
      aiVerdict: score >= 8 ? 'Solid Progress' : 'Routine Maintenance',
      aiFeedback: `Logged "${params.title}" under ${params.category}. Good consistency, but push for higher intensity on key targets. (Note: Provide GEMINI_API_KEY in .env for full live AI critiques)`,
      aiRecommendation: 'Follow up with measurable output tomorrow to compound this gain.',
      isVanityTask: false,
    };
  }

  const prompt = `
You are the Squad's direct, candid, and constructive AI Accountability Coach for a high-performance group of 3 friends.
Evaluate this user's logged achievement against their declared long-term goals:

User Goals: ${params.userGoals.length > 0 ? params.userGoals.join(', ') : 'Self-improvement & peak discipline'}
Logged Achievement: "${params.title}"
Category: ${params.category}
Time Spent: ${params.timeSpentMin ? `${params.timeSpentMin} minutes` : 'Unspecified'}
Details: "${params.description}"

Analyze the task:
1. Is this genuine needle-moving progress, or superficial busywork / vanity procrastination?
2. Rate the real impact from 1 to 10.
3. Provide a direct, constructive coach critique (2-3 sentences).
4. Provide one sharp next-step recommendation.

Return ONLY a valid JSON object with exact keys:
{
  "impactScore": <number 1-10>,
  "aiVerdict": "<High-Impact Breakthrough | Solid Progress | Routine Maintenance | Superficial Busywork>",
  "aiFeedback": "<string>",
  "aiRecommendation": "<string>",
  "isVanityTask": <true | false>
}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text() || '{}';
    const parsed = JSON.parse(text);

    return {
      impactScore: Math.min(10, Math.max(1, Number(parsed.impactScore) || 6)),
      aiVerdict: parsed.aiVerdict || 'Solid Progress',
      aiFeedback: parsed.aiFeedback || 'Progress recorded.',
      aiRecommendation: parsed.aiRecommendation || 'Stay consistent.',
      isVanityTask: Boolean(parsed.isVanityTask),
    };
  } catch (error) {
    console.error('Gemini evaluation error:', error);
    return {
      impactScore: 6,
      aiVerdict: 'Logged Progress',
      aiFeedback: 'Achievement recorded. AI service temporarily encountered an issue, but consistency noted.',
      aiRecommendation: 'Keep up the momentum.',
      isVanityTask: false,
    };
  }
}

/**
 * AI Chart & Analytics Generator:
 * Turns squad achievement data into structured visual charts (labels, datasets, coach breakdown).
 */
export async function generateSquadChartInsight(params: {
  query: string;
  squadName: string;
  memberStats: Array<{
    name: string;
    totalAchievements: number;
    streakDays: number;
    avgImpactScore: number;
    categories: Record<string, number>;
  }>;
}): Promise<ChartInsight> {
  const genAI = getAIClient();

  // Fallback heuristic chart if no API key
  if (!genAI) {
    const labels = params.memberStats.map((m) => m.name);
    return {
      title: `Squad Comparison: ${params.query || 'Overall Consistency'}`,
      chartType: 'bar',
      labels,
      datasets: [
        {
          label: 'Total Achievements',
          data: params.memberStats.map((m) => m.totalAchievements),
          color: '#38bdf8',
        },
        {
          label: 'Current Streak (Days)',
          data: params.memberStats.map((m) => m.streakDays),
          color: '#4ade80',
        },
      ],
      coachVerdict: 'Squad is showing solid daily participation. Elevate high-impact tasks to widen the gap.',
      summary: 'Comparison of achievements and streaks across all squad members.',
    };
  }

  const prompt = `
You are the Squad's AI Performance Analyst.
The squad "${params.squadName}" asked: "${params.query}".

Here is the squad's verified data:
${JSON.stringify(params.memberStats, null, 2)}

Synthesize this into a clean visual chart dataset and provide an analytical coach verdict.
Return ONLY valid JSON with this exact schema:
{
  "title": "<Chart Title>",
  "chartType": "<bar | line | pie | radar>",
  "labels": ["<label1>", "<label2>", ...],
  "datasets": [
    {
      "label": "<Metric Name>",
      "data": [<number>, <number>, ...],
      "color": "<hex code like #38bdf8>"
    }
  ],
  "coachVerdict": "<Punchy, honest 2-sentence accountability summary>",
  "summary": "<1-sentence description of the metric>"
}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text() || '{}';
    return JSON.parse(text) as ChartInsight;
  } catch (error) {
    console.error('Gemini chart generation error:', error);
    const labels = params.memberStats.map((m) => m.name);
    return {
      title: 'Squad Performance Overview',
      chartType: 'bar',
      labels,
      datasets: [
        {
          label: 'Total Achievements',
          data: params.memberStats.map((m) => m.totalAchievements),
          color: '#38bdf8',
        },
      ],
      coachVerdict: 'Keep logging daily activities to build momentum.',
      summary: 'Summary of member contributions.',
    };
  }
}

/**
 * Conversational Coach Response:
 * When users tag @AI in the squad chat asking questions or advice.
 */
export async function generateConversationalAIResponse(params: {
  query: string;
  squadName: string;
  authorName: string;
  memberStats: Array<{
    name: string;
    totalAchievements: number;
    streakDays: number;
    avgImpactScore: number;
    categories: Record<string, number>;
  }>;
}): Promise<string> {
  const genAI = getAIClient();

  if (!genAI) {
    const queryLower = params.query.toLowerCase();
    const leader = [...params.memberStats].sort((a, b) => b.totalAchievements - a.totalAchievements)[0];
    const avgStreak = Math.round(
      params.memberStats.reduce((acc, m) => acc + m.streakDays, 0) / Math.max(1, params.memberStats.length)
    );

    if (queryLower.includes('who') && (queryLower.includes('lead') || queryLower.includes('best') || queryLower.includes('win') || queryLower.includes('first'))) {
      return `🏆 Currently, **${leader?.name || 'the squad'}** is leading the board with ${leader?.totalAchievements || 0} verified achievements and an average impact score of ${leader?.avgImpactScore || 0}/10! Stay close and keep pushing.`;
    }
    if (queryLower.includes('lag') || queryLower.includes('behind') || queryLower.includes('slack')) {
      const lagging = [...params.memberStats].sort((a, b) => a.streakDays - b.streakDays)[0];
      return `⚠️ **${lagging?.name || 'Someone'}** needs a nudge! Streak is at ${lagging?.streakDays || 0} days. A 3-person squad only works when all 3 pull their weight. Check in on each other today!`;
    }
    if (queryLower.includes('motivat') || queryLower.includes('push') || queryLower.includes('advice') || queryLower.includes('help')) {
      return `🔥 Focus on high-leverage needle-movers today, ${params.authorName}. Routine tasks maintain the baseline, but deep-work breakthroughs compound. Your squad's average streak is ${avgStreak} days—don't break the chain!`;
    }
    return `🤖 Coach here for **${params.squadName}**: I'm tracking all your verified achievements, streaks, and impact ratings. Keep logging your proof daily and holding each other accountable. Current squad streak average: ${avgStreak} days.`;
  }

  const prompt = `
You are the candid, motivating, and sharp AI Coach for the 3-person accountability squad "${params.squadName}".
Squad member "${params.authorName}" tagged you with: "${params.query}".

Here are the current live verified squad metrics:
${JSON.stringify(params.memberStats, null, 2)}

Provide a concise, high-impact coach response (2 to 4 sentences maximum). Be direct, encouraging, and reference actual squad streaks or standards where relevant. Do not include markdown code fences or JSON; return plain text.
`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
    const result = await model.generateContent(prompt);
    return result.response.text()?.trim() || `Coach here: Log your proof and keep each other accountable today!`;
  } catch (err) {
    console.error('Gemini conversational coach error:', err);
    return `Coach here: Keep your daily discipline high. Your squad is counting on you to log verified wins today!`;
  }
}

/**
 * 1-on-1 Personal AI Coach Insight (Private to individual user in Insights Screen):
 * Does NOT post to squad chat; returns directly to the user.
 */
export async function generatePersonalCoachInsight(params: {
  userName: string;
  userGoals: string[];
  streakDays: number;
  achievements: Array<{
    title: string;
    category: string;
    impactScore: number;
    isVanityTask: boolean;
    createdAt: Date;
  }>;
  question: string;
}): Promise<{
  answer: string;
  strengthHighlight: string;
  nextFocusArea: string;
}> {
  const genAI = getAIClient();

  const totalAch = params.achievements.length;
  const avgScore = totalAch > 0
    ? +(params.achievements.reduce((acc, a) => acc + (a.impactScore || 5), 0) / totalAch).toFixed(1)
    : 0;
  const vanityCount = params.achievements.filter((a) => a.isVanityTask).length;

  if (!genAI) {
    return {
      answer: `Looking at your personal record, ${params.userName}: You have logged ${totalAch} wins with an average impact score of ${avgScore || 7}/10 and a ${params.streakDays}-day streak. ${
        vanityCount > 0 ? `Watch out for superficial busywork—${vanityCount} logged tasks were borderline vanity.` : 'Your focus has been genuine and high-impact.'
      } For your declared goal of "${params.userGoals[0] || 'continuous mastery'}", eliminate low-priority distractions tomorrow morning and tackle your high-leverage work first.`,
      strengthHighlight: params.streakDays >= 3 ? `Solid ${params.streakDays}-day streak continuity.` : 'Commitment to personal goal tracking.',
      nextFocusArea: params.userGoals[0] ? `Prioritize "${params.userGoals[0]}" before doing routine tasks.` : 'Tackle your single hardest task first.',
    };
  }

  const prompt = `
You are a private, elite 1-on-1 performance and accountability coach for ${params.userName}.
This evaluation is 100% PRIVATE to ${params.userName} and is NOT shared with their squad.

User Profile:
- Name: ${params.userName}
- Long-term Goals: ${params.userGoals.length > 0 ? params.userGoals.join(', ') : 'Personal mastery & discipline'}
- Current Streak: ${params.streakDays} days
- Total Logged Wins: ${totalAch}
- Average Impact Score: ${avgScore}/10
- Recent Achievements: ${JSON.stringify(params.achievements.slice(0, 7), null, 2)}

User asked you privately: "${params.question}"

Analyze their individual data and answer their question directly.
Return ONLY valid JSON with this exact structure:
{
  "answer": "<direct, personal coaching answer in 3-4 sentences>",
  "strengthHighlight": "<1 key strength shown in their data>",
  "nextFocusArea": "<1 concrete actionable priority for tomorrow>"
}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text() || '{}';
    const parsed = JSON.parse(text);
    return {
      answer: parsed.answer || 'Keep executing with high standards.',
      strengthHighlight: parsed.strengthHighlight || 'Commitment to personal tracking.',
      nextFocusArea: parsed.nextFocusArea || 'Focus on your highest leverage goal.',
    };
  } catch (err) {
    console.error('Gemini personal coach error:', err);
    return {
      answer: `You have ${totalAch} logged achievements and a ${params.streakDays}-day streak. Keep channeling effort into high-impact tasks aligned with your goals.`,
      strengthHighlight: `${params.streakDays} day streak continuity`,
      nextFocusArea: 'Complete your hardest task first thing in the morning',
    };
  }
}
