import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { squadApi, chatApi } from '../api/client';

export default function SquadMembersScreen({ navigation }: any) {
  const { currentSquad, currentUser, leaveCurrentSquad, logout, refreshSquadData, showAlert } = useApp();
  const [squadDetails, setSquadDetails] = useState<any>(currentSquad);
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  const squadId = currentSquad?.id;

  useEffect(() => {
    setSquadDetails(currentSquad);
    if (squadId) {
      loadSquad();
    }
  }, [currentSquad, squadId]);

  const loadSquad = async () => {
    if (!squadId) return;
    try {
      setLoading(true);
      const res = await squadApi.getDetails(squadId);
      if (res.success && res.squad) {
        setSquadDetails(res.squad);
      }
    } catch (err: any) {
      console.log('Error fetching squad:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const squadName = currentSquad?.name || squadDetails?.name || 'My Squad';
  const inviteCode = currentSquad?.inviteCode || squadDetails?.inviteCode || '------';
  const members = squadDetails?.members || currentSquad?.members || [];
  const memberCount = members.length;
  const maxMembers = squadDetails?.maxMembers || currentSquad?.maxMembers || 3;
  const isFull = memberCount >= maxMembers;

  const handleCopyCode = () => {
    setInviteModalVisible(true);
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join our 3-person accountability squad "${squadName}"! Use squad invite code: ${inviteCode}`,
      });
    } catch {
      handleCopyCode();
    }
  };

  const handleLeaveSquad = () => {
    showAlert({
      title: 'Leave Squad',
      message: `Are you sure you want to leave "${squadName}"? You will be permanently removed from this squad.`,
      type: 'destructive',
      icon: 'log-out-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Squad',
          style: 'destructive',
          onPress: async () => {
            await leaveCurrentSquad();
          },
        },
      ],
    });
  };

  const handleClearChat = () => {
    showAlert({
      title: 'Clear Squad Chat',
      message: 'Are you sure you want to clear chat messages for this squad? This cannot be undone.',
      type: 'destructive',
      icon: 'trash-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: async () => {
            try {
              if (squadId) {
                await chatApi.clearMessages(squadId);
                showAlert({
                  title: 'Chat Cleared',
                  message: 'Chat history has been cleared successfully.',
                  type: 'success',
                  icon: 'checkmark-circle-outline',
                });
              }
            } catch (err: any) {
              showAlert({
                title: 'Notice',
                message: 'Failed to clear chat.',
                type: 'warning',
              });
            }
          },
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtnChevron}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>{squadName}</Text>
            <Text style={styles.headerSubtitle}>Same people. Higher standards.</Text>
          </View>
          <TouchableOpacity style={styles.moreOptionsBtn} onPress={() => setMenuVisible(true)}>
            <Text style={styles.moreOptionsText}>···</Text>
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu Modal */}
        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.dropdownCard}>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => {
                  setMenuVisible(false);
                  loadSquad();
                }}
              >
                <Ionicons name="refresh-outline" size={17} color="#374151" style={styles.dropdownIcon} />
                <Text style={styles.dropdownText}>Refresh Squad Data</Text>
              </TouchableOpacity>

              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => {
                  setMenuVisible(false);
                  setInviteModalVisible(true);
                }}
              >
                <Ionicons name="copy-outline" size={17} color="#374151" style={styles.dropdownIcon} />
                <Text style={styles.dropdownText}>Invite Code & Share</Text>
              </TouchableOpacity>

              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => {
                  setMenuVisible(false);
                  handleClearChat();
                }}
              >
                <Ionicons name="trash-outline" size={17} color="#ef4444" style={styles.dropdownIcon} />
                <Text style={[styles.dropdownText, { color: '#ef4444' }]}>Clear Squad Chat</Text>
              </TouchableOpacity>

              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => {
                  setMenuVisible(false);
                  handleLeaveSquad();
                }}
              >
                <Ionicons name="log-out-outline" size={17} color="#ef4444" style={styles.dropdownIcon} />
                <Text style={[styles.dropdownText, { color: '#ef4444' }]}>Leave Squad</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Dedicated Invite Code Modal */}
        <Modal
          visible={inviteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setInviteModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.inviteModalBackdrop}
            activeOpacity={1}
            onPress={() => setInviteModalVisible(false)}
          >
            <View style={styles.inviteModalCard}>
              <View style={styles.inviteModalHeader}>
                <View style={styles.inviteIconCircle}>
                  <Ionicons name="key-outline" size={24} color="#111827" />
                </View>
                <Text style={styles.inviteModalTitle}>{squadName}</Text>
                <Text style={styles.inviteModalSubtitle}>
                  Squad Invite Code · 3-Member Circle
                </Text>
              </View>

              {/* Code Display Box */}
              <View style={styles.inviteCodeBox}>
                <Text style={styles.inviteCodeText}>{inviteCode}</Text>
              </View>

              <View style={styles.copiedBadgeRow}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.copiedBadgeText}>Code ready to share with friends</Text>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.inviteShareBtn}
                onPress={handleShareInvite}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.inviteShareBtnText}>Share Invite Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inviteCloseBtn}
                onPress={() => setInviteModalVisible(false)}
              >
                <Text style={styles.inviteCloseBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Squad Status Banner Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isFull && styles.statusDotFull]} />
            <Text style={styles.statusMemberCount}>
              {memberCount} / {maxMembers} members
            </Text>
          </View>
          <Text style={styles.statusFullText}>
            {isFull ? '✨ Your squad is full! 🎉' : `${maxMembers - memberCount} slot(s) remaining!`}
          </Text>
          <Text style={styles.statusMotto}>
            {isFull ? 'A small circle. A big difference.' : 'Share your invite code to complete your 3-person crew.'}
          </Text>
        </View>

        {/* Invite Code Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Invite Code</Text>
          <TouchableOpacity
            style={styles.codeDisplayCard}
            onPress={handleCopyCode}
            activeOpacity={0.8}
          >
            <Text style={styles.codeText}>{inviteCode}</Text>
            <Text style={styles.copyIcon}>❐</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareCodeBtn} onPress={handleShareInvite} activeOpacity={0.85}>
            <Text style={styles.shareCodeIcon}>⎋</Text>
            <Text style={styles.shareCodeText}>Share Invite Code</Text>
          </TouchableOpacity>
        </View>

        {/* Members Roster Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Members</Text>

          {loading ? (
            <ActivityIndicator color="#111827" style={{ marginVertical: 20 }} />
          ) : members.length === 0 ? (
            <View style={styles.emptyMembersBox}>
              <Text style={styles.emptyMembersText}>No members found.</Text>
            </View>
          ) : (
            members.map((m: any, idx: number) => {
              const user = m.user || {};
              const isCurrent = user.id === currentUser?.id;
              const userGoals = user.goals || [];
              const userAchievements = user.achievements || [];
              const verifiedWins = userAchievements.filter((a: any) => a.verifications?.length > 0).length;

              return (
                <View key={m.id || user.id || user.email || `member-${idx}`} style={styles.memberCard}>
                  <View style={styles.memberAvatarCircle}>
                    <Text style={styles.memberAvatarInitial}>
                      {(user.name || 'M').charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.memberInfo}>
                    {/* Name & Badge */}
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>
                        {user.name} {isCurrent ? '(You)' : ''}
                      </Text>
                      {isCurrent && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>You</Text>
                        </View>
                      )}
                    </View>

                    {/* Streak & Verified Wins */}
                    <Text style={styles.memberStreakText}>🔥 {user.streakDays || 0} day streak</Text>
                    <Text style={styles.memberVerifiedText}>🛡️ {verifiedWins} verified wins</Text>

                    {/* Goals */}
                    <Text style={styles.memberGoalsHeader}>Goals</Text>
                    {userGoals.length === 0 ? (
                      <Text style={styles.memberGoalItemEmpty}>• No specific goals set yet</Text>
                    ) : (
                      userGoals.map((g: any, gIdx: number) => (
                        <Text key={g.id || gIdx} style={styles.memberGoalItem}>
                          • {g.title || g}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Footer Actions: Switch Profile / Leave Squad */}
        <View style={styles.footerActionsRow}>
          <TouchableOpacity
            style={styles.switchProfileBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.switchProfileText}>Switch Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.leaveSquadBtn}
            onPress={handleLeaveSquad}
            activeOpacity={0.8}
          >
            <Text style={styles.leaveSquadText}>Leave Squad</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backBtnChevron: {
    fontSize: 28,
    color: '#111827',
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitleGroup: {
    flex: 1,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  moreOptionsBtn: {
    padding: 6,
  },
  moreOptionsText: {
    fontSize: 22,
    color: '#111827',
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  statusDotFull: {
    backgroundColor: '#22c55e',
  },
  statusMemberCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  statusFullText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
    marginBottom: 2,
  },
  statusMotto: {
    fontSize: 13,
    color: '#6b7280',
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  codeDisplayCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 10,
    position: 'relative',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 4,
  },
  copyIcon: {
    position: 'absolute',
    right: 18,
    fontSize: 18,
    color: '#6b7280',
  },
  shareCodeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  shareCodeIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareCodeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  memberAvatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  youBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '800',
  },
  memberStreakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  memberVerifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  memberGoalsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 4,
  },
  memberGoalItem: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 18,
  },
  memberGoalItemEmpty: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  emptyMembersBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyMembersText: {
    color: '#6b7280',
  },
  footerActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  switchProfileBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  leaveSquadBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaveSquadText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdownCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 18,
    width: 210,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 10,
  },
  // Dedicated Invite Modal Styles
  inviteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  inviteModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  inviteModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  inviteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  inviteModalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  inviteCodeBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  inviteCodeText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 6,
    color: '#111827',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 22,
  },
  copiedBadgeText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },
  inviteShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  inviteShareBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  inviteCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  inviteCloseBtnText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
});
