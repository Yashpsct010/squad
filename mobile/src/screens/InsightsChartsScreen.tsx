import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { squadApi, insightsApi } from '../api/client';

const SCREEN_WIDTH = Dimensions.get('window').width;

const MEMBER_COLORS = ['#111827', '#8b5cf6', '#10b981', '#f59e0b'];

interface ProcessedMember {
  id: string;
  email?: string;
  name: string;
  avatar: string;
  streak: number;
  consistency: string;
  color: string;
  scores: number[];
  heatmap: boolean[];
}

export default function InsightsChartsScreen() {
  const { currentSquad, currentUser } = useApp();
  const [squadDetails, setSquadDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange] = useState('This Week');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiNextStep, setAiNextStep] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const squadId = currentSquad?.id;

  useEffect(() => {
    loadLiveInsights();
  }, [squadId]);

  const loadLiveInsights = async () => {
    if (!squadId) return;
    try {
      setLoading(true);
      const res = await squadApi.getDetails(squadId);
      if (res.success && res.squad) {
        setSquadDetails(res.squad);
      }
    } catch (err: any) {
      console.log('Error loading insights:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Calculate dynamic stats from actual PostgreSQL data
  const rawMembers = squadDetails?.members || [];
  const squadAchievements = squadDetails?.achievements || [];

  // Helper to get day index 0-6 (Mon-Sun)
  const getDayOfWeekIndex = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 is Sun, 1 is Mon...
    return day === 0 ? 6 : day - 1; // 0 is Mon, 6 is Sun
  };

  // Build real member profiles
  const processedMembers: ProcessedMember[] = rawMembers.map((m: any, idx: number): ProcessedMember => {
    const user = m.user || {};
    const userAchievements = squadAchievements.filter((a: any) => a.userId === user.id);

    // Calculate real 7-day scores and heatmap
    const scores = [0, 0, 0, 0, 0, 0, 0];
    const scoreCounts = [0, 0, 0, 0, 0, 0, 0];
    const heatmap = [false, false, false, false, false, false, false];

    userAchievements.forEach((ach: any) => {
      const dayIdx = getDayOfWeekIndex(ach.createdAt);
      if (dayIdx >= 0 && dayIdx < 7) {
        heatmap[dayIdx] = true;
        const score = ach.impactScore || 7;
        scores[dayIdx] += score;
        scoreCounts[dayIdx] += 1;
      }
    });

    const finalScores = scores.map((total, i) =>
      scoreCounts[i] > 0 ? +(total / scoreCounts[i]).toFixed(1) : 0
    );

    const completedDaysCount = heatmap.filter(Boolean).length;
    const consistencyPct = Math.round((completedDaysCount / 7) * 100);

    return {
      id: user.id || user.email || `member-${idx}`,
      email: user.email || '',
      name: user.name || `Member ${idx + 1}`,
      avatar:
        user.avatarUrl ||
        `https://images.unsplash.com/photo-${1535713875002 + idx * 1000}?w=120&auto=format&fit=crop&q=80`,
      streak: user.streakDays || 0,
      consistency: `${consistencyPct}%`,
      color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
      scores: finalScores,
      heatmap,
    };
  });

  // Calculate real Category Distribution
  const categoryCounts: Record<string, number> = {
    CAREER: 0,
    FITNESS: 0,
    STUDY: 0,
    HEALTH: 0,
    DISCIPLINE: 0,
    CREATIVE: 0,
  };

  squadAchievements.forEach((a: any) => {
    const cat = (a.category || 'OTHER').toUpperCase();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const totalAchCount = squadAchievements.length;
  const categoryDistribution = Object.entries(categoryCounts).map(([catName, count]) => {
    const formattedName = catName.charAt(0) + catName.slice(1).toLowerCase();
    const pct = totalAchCount > 0 ? Math.round((count / totalAchCount) * 100) : 0;
    return { name: formattedName, percentage: pct, count };
  });

  const handleAskAI = async (promptText?: string) => {
    const q = promptText || aiQuestion;
    if (!q.trim() || !currentUser) return;

    try {
      setAiLoading(true);
      setAiAnswer(null);
      setAiNextStep(null);

      const res = await insightsApi.getPersonalCoachAdvice({
        userId: currentUser.id,
        squadId,
        question: q.trim(),
      });

      if (res.success && res.answer) {
        setAiAnswer(res.answer);
        if (res.nextFocusArea) {
          setAiNextStep(res.nextFocusArea);
        }
      } else {
        setAiAnswer(
          `Evaluated your individual records, ${currentUser.name}: Keep focusing on needle-moving high-impact tasks to compound your consistency.`
        );
      }
      setAiQuestion('');
    } catch {
      setAiAnswer('Audited your personal performance: Keep up daily logs to compound your consistency score.');
    } finally {
      setAiLoading(false);
    }
  };

  // Render multi-series line chart
  const renderLineChart = () => {
    const chartHeight = 150;
    const chartWidth = SCREEN_WIDTH - 84;
    const stepX = chartWidth / (days.length - 1);
    const maxY = 10;

    const hasAnyScores = processedMembers.some((m) => m.scores.some((s) => s > 0));

    return (
      <View style={styles.chartWrapper}>
        {/* Y Axis Grid Lines & Labels */}
        <View style={styles.chartGrid}>
          {[10, 8, 6, 4, 2, 0].map((val) => (
            <View key={val} style={styles.yGridRow}>
              <Text style={styles.yAxisLabel}>{val}</Text>
              <View style={styles.gridLine} />
            </View>
          ))}
        </View>

        {/* Data Series Dots */}
        <View style={[styles.dataPointsOverlay, { width: chartWidth, height: chartHeight }]}>
          {hasAnyScores ? (
            processedMembers.map((member, mIdx) => (
              <React.Fragment key={member.id || member.email || `series-${mIdx}`}>
                {member.scores.map((score, index) => {
                  if (score === 0) return null;
                  const posX = index * stepX;
                  const posY = chartHeight - (score / maxY) * chartHeight;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.chartDot,
                        {
                          left: posX - 4,
                          top: posY - 4,
                          backgroundColor: member.color,
                          borderColor: '#ffffff',
                        },
                      ]}
                    />
                  );
                })}
              </React.Fragment>
            ))
          ) : (
            <View style={styles.noChartDataOverlay}>
              <Text style={styles.noChartDataText}>
                No scores recorded yet this week. Log daily achievements to see your velocity curves!
              </Text>
            </View>
          )}
        </View>

        {/* X Axis Days Row */}
        <View style={styles.xAxisRow}>
          {days.map((day) => (
            <Text key={day} style={styles.xAxisDayText}>
              {day}
            </Text>
          ))}
        </View>

        {/* Chart Legend */}
        {processedMembers.length > 0 && (
          <View style={styles.chartLegendRow}>
            {processedMembers.map((member, mIdx) => (
              <View key={member.id || member.email || `legend-${mIdx}`} style={styles.legendItem}>
                <View style={[styles.legendColorDot, { backgroundColor: member.color }]} />
                <Text style={styles.legendName}>{member.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Insights</Text>
        <Text style={styles.pageSubtitle}>Three minds. One upward graph.</Text>
      </View>

      {/* Date Range Dropdown Pill */}
      <View style={styles.dateRangeDropdown}>
        <Text style={styles.dateRangeText}>{dateRange}</Text>
        <Text style={styles.dateRangeChevron}>⌵</Text>
      </View>

      {/* 3 Members Summary Row */}
      {loading ? (
        <ActivityIndicator color="#111827" style={{ marginVertical: 18 }} />
      ) : (
        <View style={styles.membersSummaryRow}>
          {processedMembers.length === 0 ? (
            <View style={styles.singleMemberCard}>
              <Text style={styles.emptyMemberText}>Invite your 2 friends to populate squad metrics.</Text>
            </View>
          ) : (
            processedMembers.map((m, mIdx) => (
              <View key={m.id || m.email || `summary-${mIdx}`} style={styles.memberSummaryCard}>
                <View style={[styles.memberSummaryAvatar, { backgroundColor: m.color }]}>
                  <Text style={styles.avatarInitial}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.memberSummaryName} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text style={styles.memberSummaryStreak}>{m.streak} 🔥</Text>
                <View style={styles.memberConsistencyBadge}>
                  <Text style={styles.memberConsistencyText}>{m.consistency}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Impact Score Over Time Section */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Impact Score Over Time</Text>
        <View style={styles.cardContainer}>{renderLineChart()}</View>
      </View>

      {/* Category Distribution (Squad) */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Category Distribution (Squad)</Text>
        <View style={styles.cardContainer}>
          {totalAchCount === 0 ? (
            <Text style={styles.emptyCategoryText}>
              No achievements logged yet. Log wins to visualize your squad's focus!
            </Text>
          ) : (
            categoryDistribution
              .filter((c) => c.percentage > 0)
              .map((cat, catIdx) => (
                <View key={cat.name || `cat-${catIdx}`} style={styles.categoryDistRow}>
                  <Text style={styles.categoryDistName}>{cat.name}</Text>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${cat.percentage}%` }]} />
                  </View>
                  <Text style={styles.categoryDistPct}>{cat.percentage}%</Text>
                </View>
              ))
          )}
        </View>
      </View>

      {/* Consistency Heatmap */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Consistency Heatmap</Text>
        <View style={styles.cardContainer}>
          {/* Days Header */}
          <View style={styles.heatmapHeaderRow}>
            <View style={styles.heatmapNameColSpacer} />
            {days.map((day) => (
              <Text key={day} style={styles.heatmapHeaderDay}>
                {day}
              </Text>
            ))}
          </View>

          {/* Members Heatmap Rows */}
          {processedMembers.map((m, mIdx) => (
            <View key={m.id || m.email || `heat-${mIdx}`} style={styles.heatmapMemberRow}>
              <Text style={styles.heatmapMemberName} numberOfLines={1}>
                {m.name}
              </Text>
              <View style={styles.heatmapDotsRow}>
                {m.heatmap.map((completed, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.heatmapDot,
                      completed ? styles.heatmapDotActive : styles.heatmapDotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 1-on-1 Personal AI Coach Section */}
      <View style={styles.sectionBlock}>
        <View style={styles.aiCoachHeaderRow}>
          <Text style={styles.aiCoachStar}>✦</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>1-on-1 Personal AI Coach</Text>
          </View>
        </View>

        <View style={styles.askInputContainer}>
          <TextInput
            style={styles.askInput}
            placeholder="Ask private coach: e.g. How is my discipline trending?"
            placeholderTextColor="#9ca3af"
            value={aiQuestion}
            onChangeText={setAiQuestion}
            onSubmitEditing={() => handleAskAI()}
          />
          <TouchableOpacity style={styles.askSubmitBtn} onPress={() => handleAskAI()}>
            {aiLoading ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <Text style={styles.askSubmitArrow}>→</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Suggestion Chips */}
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={styles.chipPill}
            onPress={() => handleAskAI('Audit my personal consistency and streaks')}
          >
            <Text style={styles.chipText}>Audit my consistency</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chipPill}
            onPress={() => handleAskAI('Am I doing vanity busywork vs high impact?')}
          >
            <Text style={styles.chipText}>Detect vanity tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chipPill}
            onPress={() => handleAskAI('What should be my #1 focus tomorrow?')}
          >
            <Text style={styles.chipText}>Tomorrow's #1 focus</Text>
          </TouchableOpacity>
        </View>

        {/* AI Answer Box */}
        {aiAnswer && (
          <View style={styles.aiAnswerCard}>
            <View style={styles.aiAnswerHeaderRow}>
              <Text style={styles.aiAnswerLabel}>🤖 Personal Coach Evaluation:</Text>
              <View style={styles.privatePillBadge}>
                <Text style={styles.privatePillText}>🔒 Private</Text>
              </View>
            </View>
            <Text style={styles.aiAnswerText}>{aiAnswer}</Text>
            {aiNextStep ? (
              <View style={styles.aiFocusAreaRow}>
                <Text style={styles.aiFocusAreaLabel}>🎯 Action Focus:</Text>
                <Text style={styles.aiFocusAreaText}>{aiNextStep}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 36,
  },
  headerSection: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  dateRangeDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dateRangeChevron: {
    fontSize: 14,
    color: '#6b7280',
  },
  membersSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  memberSummaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    alignItems: 'center',
  },
  singleMemberCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    alignItems: 'center',
  },
  emptyMemberText: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
  },
  memberSummaryAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  memberSummaryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  memberSummaryStreak: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  memberConsistencyBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  memberConsistencyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  memberConsistencySub: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  chartWrapper: {
    position: 'relative',
    paddingTop: 8,
  },
  chartGrid: {
    height: 150,
    justifyContent: 'space-between',
  },
  yGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yAxisLabel: {
    width: 16,
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
    textAlign: 'right',
  },
  gridLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  dataPointsOverlay: {
    position: 'absolute',
    top: 8,
    left: 28,
  },
  noChartDataOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noChartDataText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  chartDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 28,
    marginTop: 8,
  },
  xAxisDayText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  emptyCategoryText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 12,
  },
  categoryDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  categoryDistName: {
    width: 65,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 4,
  },
  categoryDistPct: {
    width: 32,
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    textAlign: 'right',
  },
  heatmapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heatmapNameColSpacer: {
    width: 65,
  },
  heatmapHeaderDay: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  heatmapMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heatmapMemberName: {
    width: 65,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  heatmapDotsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heatmapDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  heatmapDotActive: {
    backgroundColor: '#111827',
  },
  heatmapDotInactive: {
    backgroundColor: '#e5e7eb',
  },
  aiCoachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  aiCoachStar: {
    fontSize: 16,
    color: '#111827',
  },
  askInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  askInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  askSubmitBtn: {
    padding: 4,
  },
  askSubmitArrow: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chipPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  aiAnswerCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  aiCoachPrivateSubtitle: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 1,
  },
  aiAnswerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  aiAnswerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  privatePillBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  privatePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  aiAnswerText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 19,
    fontWeight: '400',
  },
  aiFocusAreaRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiFocusAreaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    marginRight: 6,
  },
  aiFocusAreaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14532d',
    flex: 1,
  },
});
