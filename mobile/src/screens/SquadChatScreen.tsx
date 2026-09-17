import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatApi, achievementApi, squadApi, initSquadSocket, disconnectSocket, API_BASE_URL } from '../api/client';
import { useApp } from '../context/AppContext';

export default function SquadChatScreen({ navigation }: any) {
  const { currentUser, currentSquad, leaveCurrentSquad, logout, refreshSquadData, showAlert } = useApp();
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const squadId = currentSquad?.id;
  const isAuthenticated = !!currentUser && !!squadId;

  const squadName = currentSquad?.name || 'Squad Room';
  const membersCount = currentSquad?.members?.length || 1;
  const streakDays = currentUser?.streakDays || 1;

  useEffect(() => {
    loadData();

    if (squadId) {
      const socket = initSquadSocket(squadId);

      socket.on('new_message', (message: any) => {
        setTimelineItems((prev) => {
          if (prev.some((item) => item.id === message.id)) return prev;
          return [...prev, { ...message, itemType: 'chat' }];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('new_achievement', (achievement: any) => {
        setTimelineItems((prev) => {
          if (prev.some((item) => item.id === achievement.id)) return prev;
          return [
            ...prev,
            {
              id: achievement.id,
              userId: achievement.userId,
              user: achievement.user,
              createdAt: achievement.createdAt,
              content: `${achievement.user?.name || 'A member'} logged a new win: "${achievement.title}"`,
              itemType: 'achievement',
              achievement,
            },
          ];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('achievement_verified', () => {
        loadData();
      });

      return () => {
        disconnectSocket();
      };
    }
  }, [squadId]);

  const loadData = async () => {
    if (!squadId) return;
    try {
      setLoading(true);
      const [chatRes, achRes] = await Promise.all([
        chatApi.getMessages(squadId),
        achievementApi.getBySquad(squadId),
      ]);

      const chats = (chatRes.messages || []).map((m: any) => ({
        ...m,
        itemType: 'chat',
      }));

      const achs = (achRes.achievements || []).map((a: any) => ({
        id: a.id,
        userId: a.userId,
        user: a.user,
        createdAt: a.createdAt,
        content: `${a.user?.name || 'A member'} logged: "${a.title}"`,
        itemType: 'achievement',
        achievement: a,
      }));

      const merged = [...chats, ...achs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setTimelineItems(merged);
    } catch (err: any) {
      console.log('Error loading stream data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!isAuthenticated) {
      showAlert({
        title: 'Sign In Required',
        message: 'Please sign in and join a squad to participate in chat.',
        type: 'info',
        icon: 'lock-closed-outline',
      });
      return;
    }

    if (!inputText.trim() || !currentUser || !squadId) return;
    const text = inputText.trim();
    setInputText('');

    try {
      await chatApi.sendMessage(squadId, currentUser.id, text);
    } catch (err: any) {
      showAlert({
        title: 'Notice',
        message: 'Could not send message. Please ensure backend is running.',
        type: 'warning',
      });
    }
  };

  const handleVerify = async (achievementId: string) => {
    if (!currentUser) {
      showAlert({
        title: 'Sign In Required',
        message: 'Please sign in to verify achievements.',
        type: 'info',
      });
      return;
    }
    try {
      const res = await achievementApi.verify(achievementId, currentUser.id);
      if (res.success) {
        showAlert({
          title: 'Verified! 🛡️',
          message: 'You confirmed your friend’s proof.',
          type: 'success',
          icon: 'shield-checkmark-outline',
        });
        await loadData();
      }
    } catch (err: any) {
      showAlert({
        title: 'Notice',
        message: err.response?.data?.error || 'Verification recorded.',
        type: 'info',
      });
    }
  };

  const handleClearChat = () => {
    showAlert({
      title: 'Clear Squad Chat',
      message: 'Are you sure you want to clear chat messages for this squad? This will remove chat history for all squad members.',
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
                setTimelineItems([]);
                showAlert({
                  title: 'Chat Cleared',
                  message: 'Chat history has been cleared.',
                  type: 'success',
                  icon: 'checkmark-circle-outline',
                });
              }
            } catch (err: any) {
              showAlert({
                title: 'Notice',
                message: 'Could not clear chat: ' + (err.message || 'Error'),
                type: 'warning',
              });
            }
          },
        },
      ],
    });
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

  const formatDuration = (mins?: number | null) => {
    if (!mins) return '30m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const renderTimelineItem = ({ item }: { item: any }) => {
    const isMe = item.userId === currentUser?.id;
    const isAchievementCard = item.type === 'ACHIEVEMENT_CARD' && (item.achievement || item.metadata?.achievement);
    const isAiChart = item.type === 'AI_CHART';
    const isAiMessage = item.userId === null || item.type === 'AI_RESPONSE';

    // 1. Render Achievement Card in unified stream
    if (isAchievementCard) {
      const ach = item.achievement || item.metadata?.achievement;
      const user = item.user || ach.user || {};
      const verifications = ach.verifications || [];
      const isVerifiedByMe = verifications.some((v: any) => v.verifierId === currentUser?.id);
      const isMyAchievement = (item.userId || ach.userId) === currentUser?.id;
      const maxVerifiers = Math.max(1, membersCount - 1);
      const mediaList = ach.mediaUrls || [];

      return (
        <View style={styles.postCard}>
          {/* Post Header: Author info on Left, Category Pill on Right */}
          <View style={styles.postHeaderRow}>
            <View style={styles.postAuthorGroup}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{(user.name || 'S').charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.authorName}>{user.name || 'Squad Member'}</Text>
                <Text style={styles.postTime}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillStar}>★</Text>
              <Text style={styles.categoryPillText}>{ach.category || 'GENERAL'}</Text>
              {ach.timeSpentMin ? (
                <Text style={styles.categoryPillDuration}> · {formatDuration(ach.timeSpentMin)}</Text>
              ) : null}
            </View>
          </View>

          {/* Achievement Title directly on the card */}
          <Text style={styles.postTitle}>{ach.title}</Text>

          {/* Description directly below title (no extra nested div) */}
          {ach.description ? (
            <Text style={styles.postDescription}>{ach.description}</Text>
          ) : null}

          {/* Media Proof Gallery: Clickable with Fullscreen Lightbox */}
          {mediaList.length > 0 && (
            mediaList.length === 1 ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  const url = mediaList[0];
                  setSelectedImageUrl(url.startsWith('http') ? url : `${API_BASE_URL}${url}`);
                }}
                style={styles.mediaSingleContainer}
              >
                <Image
                  source={{ uri: mediaList[0].startsWith('http') ? mediaList[0] : `${API_BASE_URL}${mediaList[0]}` }}
                  style={styles.mediaSingleImage}
                  resizeMode="cover"
                />
                <View style={styles.mediaExpandBadge}>
                  <Ionicons name="expand-outline" size={14} color="#ffffff" />
                </View>
              </TouchableOpacity>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaGalleryScrollContent}
                style={styles.mediaGalleryScroll}
              >
                {mediaList.map((url: string, idx: number) => {
                  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.88}
                      onPress={() => setSelectedImageUrl(fullUrl)}
                      style={styles.mediaThumbTouchable}
                    >
                      <Image
                        source={{ uri: fullUrl }}
                        style={styles.mediaThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.mediaExpandBadge}>
                        <Ionicons name="expand-outline" size={13} color="#ffffff" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )
          )}

          {/* AI Review Box */}
          <View style={styles.aiReviewContainer}>
            <View style={styles.aiReviewHeader}>
              <View style={styles.aiReviewTitleRow}>
                <Text style={styles.aiReviewStar}>★</Text>
                <Text style={styles.aiReviewLabel}>AI Coach Review</Text>
              </View>
              <View style={styles.aiScorePill}>
                <Text style={styles.aiScoreText}>{ach.impactScore ? `${ach.impactScore}/10` : '8/10'}</Text>
              </View>
            </View>

            <Text style={styles.aiVerdictSub}>{ach.aiVerdict || 'Solid Progress'}</Text>
            <Text style={styles.aiFeedbackText}>
              {ach.aiFeedback || 'Consistent disciplined execution recorded.'}
            </Text>

            {ach.aiRecommendation ? (
              <View style={styles.aiNextStepRow}>
                <Text style={styles.aiNextStepIcon}>💡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiNextStepLabel}>Next step</Text>
                  <Text style={styles.aiNextStepText}>{ach.aiRecommendation}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Card Footer: Verifications & Verified CTA */}
          <View style={styles.postFooterRow}>
            <Text style={styles.verifiedCountLabel}>
              🛡️ {verifications.length}/{maxVerifiers} verified
            </Text>

            {!isMyAchievement ? (
              <TouchableOpacity
                style={[styles.verifiedPill, isVerifiedByMe && styles.verifiedPillActive]}
                onPress={() => handleVerify(ach.id)}
                disabled={isVerifiedByMe}
                activeOpacity={0.8}
              >
                <Text style={styles.verifiedPillText}>
                  {isVerifiedByMe ? '✓ Verified' : 'Verify Proof'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.myPostBadge}>
                <Text style={styles.myPostBadgeText}>Your Post</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    // 2. Render AI Chart or Performance Audit Card in stream
    if (isAiChart) {
      const meta = item.metadata;
      return (
        <View style={styles.aiMessageCard}>
          <Text style={styles.aiMessageTitle}>📊 {meta?.title || 'AI Squad Analytics'}</Text>
          <Text style={styles.aiMessageContent}>{item.content}</Text>
          {meta?.coachVerdict ? (
            <View style={styles.aiCoachVerdictPill}>
              <Text style={styles.aiCoachVerdictText}>🤖 Verdict: {meta.coachVerdict}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    // 2.5 Render Conversational AI Coach response in stream
    if (isAiMessage) {
      return (
        <View style={styles.aiCoachRow}>
          <View style={styles.aiCoachBubble}>
            <View style={styles.aiCoachBadgeRow}>
              <Text style={styles.aiCoachBadgeIcon}>🤖</Text>
              <Text style={styles.aiCoachBadgeLabel}>AI Coach</Text>
            </View>
            <Text style={styles.aiCoachText}>{item.content}</Text>
            <Text style={styles.aiCoachTime}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    // 3. Render Standard Chat Message
    return (
      <View style={[styles.chatRow, isMe ? styles.chatRowRight : styles.chatRowLeft]}>
        <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
          {!isMe && <Text style={styles.chatAuthorName}>{item.user?.name || 'Squad Member'}</Text>}
          <Text style={[styles.chatText, isMe && styles.chatTextMe]}>{item.content}</Text>
          <Text style={[styles.chatTime, isMe && styles.chatTimeMe]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.titleContainer}>
          <TouchableOpacity style={styles.dropdownTitleBtn} onPress={() => navigation?.navigate('Squad')}>
            <Text style={styles.headerTitle}>{squadName}</Text>
            <Text style={styles.chevronIcon}>⌵</Text>
          </TouchableOpacity>
          <Text style={styles.headerSubtitle}>
            {membersCount} members · {streakDays} day streak 🔥
          </Text>
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
                handleClearChat();
              }}
            >
              <Ionicons name="trash-outline" size={17} color="#ef4444" style={styles.dropdownIcon} />
              <Text style={[styles.dropdownText, { color: '#ef4444' }]}>Clear Chat</Text>
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
              <Text style={styles.dropdownText}>Copy Invite Code</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity
              style={styles.dropdownRow}
              onPress={() => {
                setMenuVisible(false);
                navigation?.navigate('Squad');
              }}
            >
              <Ionicons name="people-outline" size={17} color="#374151" style={styles.dropdownIcon} />
              <Text style={styles.dropdownText}>Squad Members</Text>
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

      {/* Fullscreen Image Lightbox Modal */}
      <Modal
        visible={!!selectedImageUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setSelectedImageUrl(null)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>

          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}

          <Text style={styles.lightboxHintText}>Tap ✕ to close</Text>
        </View>
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
              <Text style={styles.inviteCodeText}>{currentSquad?.inviteCode || '------'}</Text>
            </View>

            <View style={styles.copiedBadgeRow}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={styles.copiedBadgeText}>Code ready to share with friends</Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.inviteShareBtn}
              onPress={async () => {
                try {
                  await Share.share({
                    message: `Join our 3-person accountability squad "${squadName}"! Enter squad invite code: ${currentSquad?.inviteCode}`,
                  });
                } catch {
                  // Fallback
                }
              }}
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

      {/* Unified Timeline Stream (No toggle needed) */}
      {loading ? (
        <ActivityIndicator size="large" color="#111827" style={{ flex: 1, marginTop: 40 }} />
      ) : timelineItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔥</Text>
          <Text style={styles.emptyTitle}>Squad stream is ready</Text>
          <Text style={styles.emptySubtitle}>
            Post your first daily achievement with proof, or message your squad below!
          </Text>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.emptyCtaBtn}
              onPress={() => navigation?.navigate('LogAchievement')}
            >
              <Text style={styles.emptyCtaText}>Log First Win →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={timelineItems}
          keyExtractor={(item) => item.id}
          renderItem={renderTimelineItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Message Input Bar */}
      <View style={styles.bottomInputBar}>
        <TouchableOpacity
          style={[styles.attachBtn, !isAuthenticated && styles.btnDisabled]}
          onPress={() => {
            if (!isAuthenticated) {
              showAlert({
                title: 'Sign In Required',
                message: 'Please sign in and join a squad to log achievements.',
                type: 'info',
                icon: 'lock-closed-outline',
              });
              return;
            }
            navigation?.navigate('LogAchievement');
          }}
          disabled={!isAuthenticated}
        >
          <Text style={styles.attachBtnText}>+</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, !isAuthenticated && styles.textInputDisabled]}
          placeholder={isAuthenticated ? "Message or ask @AI..." : "Sign in to send messages..."}
          placeholderTextColor="#9ca3af"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          editable={isAuthenticated}
        />

        <TouchableOpacity
          style={[styles.aiChipBtn, !isAuthenticated && styles.btnDisabled]}
          onPress={() => {
            if (!isAuthenticated) return;
            setInputText('@AI ');
          }}
          disabled={!isAuthenticated}
        >
          <Text style={styles.aiChipText}>@AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendCircleBtn, !isAuthenticated && styles.btnDisabled]}
          onPress={handleSend}
          disabled={!isAuthenticated}
        >
          <Text style={styles.sendArrow}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  titleContainer: {
    flex: 1,
  },
  dropdownTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  chevronIcon: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAuthorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  postTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPillStar: {
    color: '#16a34a',
    fontSize: 10,
    marginRight: 4,
  },
  categoryPillText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  categoryPillDuration: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 6,
  },
  postDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 14,
  },
  mediaSingleContainer: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  mediaSingleImage: {
    width: '100%',
    height: '100%',
  },
  mediaGalleryScroll: {
    marginBottom: 14,
    marginHorizontal: -4,
  },
  mediaGalleryScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  mediaThumbTouchable: {
    width: 135,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1e293b',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  mediaExpandBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 6,
    padding: 4,
  },
  postFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  mediaThumbExtra: {
    flex: 1,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  extraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraOverlayText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  aiReviewContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  aiReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiReviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiReviewStar: {
    color: '#15803d',
    fontSize: 12,
  },
  aiReviewLabel: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
  },
  aiScorePill: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  aiScoreText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  aiVerdictSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  aiFeedbackText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    marginBottom: 8,
  },
  aiNextStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  aiNextStepIcon: {
    fontSize: 12,
    marginTop: 1,
  },
  aiNextStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  aiNextStepText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  achFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  verifiedAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedCountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  verifiedPill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  verifiedPillActive: {
    backgroundColor: '#dcfce7',
  },
  verifiedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  myPostBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  myPostBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  aiCoachRow: {
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  aiCoachBubble: {
    maxWidth: '88%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aiCoachBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiCoachBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  aiCoachBadgeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  aiCoachText: {
    fontSize: 14,
    color: '#f8fafc',
    lineHeight: 20,
    fontWeight: '400',
  },
  aiCoachTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'right',
  },
  chatRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  chatRowLeft: {
    justifyContent: 'flex-start',
  },
  chatRowRight: {
    justifyContent: 'flex-end',
  },
  chatBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  chatBubbleMe: {
    backgroundColor: '#111827',
  },
  chatBubbleOther: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chatAuthorName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 2,
  },
  chatText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 19,
  },
  chatTextMe: {
    color: '#ffffff',
  },
  chatTime: {
    fontSize: 10,
    color: '#9ca3af',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatTimeMe: {
    color: '#9ca3af',
  },
  aiMessageCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
  },
  aiMessageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 4,
  },
  aiMessageContent: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  aiCoachVerdictPill: {
    marginTop: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    padding: 8,
  },
  aiCoachVerdictText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  bottomInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  attachBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtnText: {
    fontSize: 20,
    color: '#4b5563',
    fontWeight: '600',
    marginTop: -2,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  textInputDisabled: {
    opacity: 0.6,
  },
  aiChipBtn: {
    backgroundColor: '#edeef1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  aiChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  sendCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendArrow: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: -2,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCtaBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCtaText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
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
  // Fullscreen Lightbox Styles
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
    borderRadius: 12,
  },
  lightboxHintText: {
    position: 'absolute',
    bottom: 30,
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
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
