import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

export default function AuthSetupScreen() {
  const { currentUser, currentSquad, loginUser, createNewSquad, joinExistingSquad, loading, showAlert } = useApp();

  // Auth mode: 'signup' (Name, Email, Goals) or 'signin' (Email only)
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Squad modal states
  const [modalType, setModalType] = useState<'create' | 'join' | null>(null);
  const [squadName, setSquadName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleRemoveGoal = (index: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddGoal = () => {
    if (newGoalInput.trim()) {
      setGoals((prev) => [...prev, newGoalInput.trim()]);
      setNewGoalInput('');
      setIsAddingGoal(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!email.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter your email address.',
        type: 'warning',
      });
      return;
    }
    if (authMode === 'signup' && !name.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter your name.',
        type: 'warning',
      });
      return;
    }

    try {
      const user = await loginUser(
        email.trim(),
        authMode === 'signup' ? name.trim() : (name.trim() || 'Member'),
        goals
      );

      // If user already belongs to a squad, loginUser automatically connects them!
      if (!user.memberships || user.memberships.length === 0) {
        showAlert({
          title: 'Account Ready! 👋',
          message: `Welcome ${user.name}! Now either create a new 3-person squad or join an existing one with an invite code.`,
          type: 'success',
          icon: 'sparkles-outline',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Authentication',
        message: err.response?.data?.error || err.message || 'Could not connect to backend.',
        type: 'warning',
      });
    }
  };

  const handleCreateSquad = async () => {
    if (!squadName.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter a name for your squad.',
        type: 'warning',
      });
      return;
    }
    if (!currentUser) {
      showAlert({
        title: 'Notice',
        message: 'Please complete sign-in first.',
        type: 'info',
      });
      return;
    }

    try {
      await createNewSquad(squadName.trim(), currentUser.id);
      setModalType(null);
    } catch (err: any) {
      showAlert({
        title: 'Squad Creation',
        message: err.response?.data?.error || err.message || 'Squad created successfully.',
        type: 'warning',
      });
    }
  };

  const handleJoinSquad = async () => {
    if (!inviteCode.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter the 6-character squad code.',
        type: 'warning',
      });
      return;
    }
    if (!currentUser) {
      showAlert({
        title: 'Notice',
        message: 'Please complete sign-in first.',
        type: 'info',
      });
      return;
    }

    try {
      await joinExistingSquad(inviteCode.trim(), currentUser.id);
      setModalType(null);
    } catch (err: any) {
      showAlert({
        title: 'Join Squad',
        message: err.response?.data?.error || err.message || 'Joined squad successfully.',
        type: 'warning',
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <Text style={styles.logoText}>S Q U A D</Text>
        </View>

        {/* Hero Title */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Better{'\n'}you, together.</Text>
          <Text style={styles.heroSubtitle}>
            Real progress. No noise.
          </Text>
        </View>

        {!currentUser ? (
          /* STEP 1: AUTHENTICATION (SIGN UP OR SIGN IN) */
          <View style={styles.authContainer}>
            {/* Mode Switcher */}
            <View style={styles.authModeRow}>
              <TouchableOpacity
                style={[styles.authModeBtn, authMode === 'signup' && styles.authModeBtnActive]}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={[styles.authModeText, authMode === 'signup' && styles.authModeTextActive]}>
                  New Account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authModeBtn, authMode === 'signin' && styles.authModeBtnActive]}
                onPress={() => setAuthMode('signin')}
              >
                <Text style={[styles.authModeText, authMode === 'signin' && styles.authModeTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input: Your Name (if sign up) */}
            {authMode === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Your name</Text>
                <TextInput
                  style={styles.inputBox}
                  placeholder="e.g. Yash"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            {/* Input: Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="e.g. yash@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Goals (if sign up) */}
            {authMode === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Your primary goals (add 1-3)</Text>
                <View style={styles.goalsContainer}>
                  {goals.map((goal, index) => (
                    <View key={index} style={styles.goalPill}>
                      <Text style={styles.goalPillText}>{goal}</Text>
                      <TouchableOpacity onPress={() => handleRemoveGoal(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.goalCloseIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {isAddingGoal ? (
                    <View style={styles.addGoalInputRow}>
                      <TextInput
                        style={styles.addGoalInput}
                        placeholder="e.g. Run 15km weekly..."
                        placeholderTextColor="#9ca3af"
                        value={newGoalInput}
                        onChangeText={setNewGoalInput}
                        onSubmitEditing={handleAddGoal}
                        autoFocus
                      />
                      <TouchableOpacity style={styles.addGoalConfirmBtn} onPress={handleAddGoal}>
                        <Text style={styles.addGoalConfirmText}>✓</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addGoalButton}
                      onPress={() => setIsAddingGoal(true)}
                    >
                      <Text style={styles.addGoalButtonText}>+ Add goal</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Submit Auth Button */}
            <TouchableOpacity
              style={[styles.primaryAuthBtn, loading && styles.primaryAuthBtnDisabled]}
              onPress={handleAuthenticate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryAuthBtnText}>
                  {authMode === 'signup' ? 'Continue to Squad Setup  →' : 'Sign In  →'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* STEP 2: SQUAD CREATION OR JOINING (ALREADY AUTHENTICATED) */
          <View style={styles.actionSection}>
            <View style={styles.currentUserBadge}>
              <Text style={styles.currentUserNameText}>Signed in as {currentUser.name}</Text>
              <Text style={styles.currentUserEmailText}>{currentUser.email}</Text>
            </View>

            <Text style={styles.actionSectionLabel}>Create or join your 3-person squad</Text>

            {/* Card 1: Create Squad */}
            <TouchableOpacity
              style={styles.squadCard}
              onPress={() => setModalType('create')}
              activeOpacity={0.8}
            >
              <View style={styles.squadCardIconBox}>
                <Text style={styles.squadCardIcon}>+</Text>
              </View>
              <View style={styles.squadCardInfo}>
                <Text style={styles.squadCardTitle}>Create a Squad</Text>
                <Text style={styles.squadCardDesc}>
                  Start a new 3-person squad and get a unique invite code.
                </Text>
              </View>
              <Text style={styles.squadCardChevron}>›</Text>
            </TouchableOpacity>

            {/* Card 2: Join Squad */}
            <TouchableOpacity
              style={styles.squadCard}
              onPress={() => setModalType('join')}
              activeOpacity={0.8}
            >
              <View style={styles.squadCardIconBox}>
                <Text style={styles.squadCardIcon}>👥</Text>
              </View>
              <View style={styles.squadCardInfo}>
                <Text style={styles.squadCardTitle}>Join a Squad</Text>
                <Text style={styles.squadCardDesc}>
                  Enter the 6-character code shared by your friend.
                </Text>
              </View>
              <Text style={styles.squadCardChevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Brand Slogan */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>SAME PEOPLE. HIGHER STANDARDS.</Text>
        </View>
      </ScrollView>

      {/* Modal for Create or Join Squad */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {modalType === 'create' ? 'Create a 3-Person Squad' : 'Enter Squad Code'}
            </Text>
            <Text style={styles.modalDesc}>
              {modalType === 'create'
                ? 'Name your group. An exclusive 6-character invite code will be created for your 2 friends.'
                : 'Enter the 6-character code your friend shared with you.'}
            </Text>

            {modalType === 'create' ? (
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. The Grind Room"
                placeholderTextColor="#9ca3af"
                value={squadName}
                onChangeText={setSquadName}
              />
            ) : (
              <TextInput
                style={[styles.modalInput, styles.modalInputCode]}
                placeholder="A7K9QP"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                maxLength={6}
                value={inviteCode}
                onChangeText={setInviteCode}
              />
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalType(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={modalType === 'create' ? handleCreateSquad : handleJoinSquad}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {modalType === 'create' ? 'Launch Squad' : 'Join Squad'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stepText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  authContainer: {
    marginBottom: 24,
  },
  authModeRow: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  authModeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  authModeBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  authModeText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  authModeTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  goalPillText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  goalCloseIcon: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
  },
  addGoalButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  addGoalButtonText: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '600',
  },
  addGoalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 4,
  },
  addGoalInput: {
    color: '#111827',
    fontSize: 13,
    paddingVertical: 6,
    minWidth: 120,
  },
  addGoalConfirmBtn: {
    padding: 6,
  },
  addGoalConfirmText: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 14,
  },
  primaryAuthBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryAuthBtnDisabled: {
    opacity: 0.5,
  },
  primaryAuthBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  actionSection: {
    marginTop: 6,
    marginBottom: 36,
  },
  currentUserBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  currentUserNameText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  currentUserEmailText: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  actionSectionLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  squadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  squadCardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  squadCardIcon: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '600',
  },
  squadCardInfo: {
    flex: 1,
  },
  squadCardTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  squadCardDesc: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  squadCardChevron: {
    color: '#9ca3af',
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
  footerRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalDesc: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 15,
    marginBottom: 18,
  },
  modalInputCode: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalCancelText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
