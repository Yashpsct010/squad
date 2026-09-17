import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { achievementApi } from '../api/client';
import { useApp } from '../context/AppContext';

const CATEGORIES = [
  'Career',
  'Fitness',
  'Study',
  'Health',
  'Discipline',
  'Creative',
];

interface MediaItem {
  uri: string;
  fileSize?: number;
  type?: string | null;
}

export default function LogAchievementScreen({ navigation }: any) {
  const { currentUser, currentSquad, refreshSquadData, showAlert } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Career');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const totalBytes = mediaList.reduce((sum, item) => sum + (item.fileSize || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  const pickMedia = async () => {
    try {
      if (mediaList.length >= 5) {
        showAlert({
          title: 'Limit Reached',
          message: 'You can upload up to 5 photos or videos per achievement.',
          type: 'warning',
        });
        return;
      }

      const remaining = 5 - mediaList.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        let runningTotal = totalBytes;
        const validNewItems: MediaItem[] = [];

        for (const asset of result.assets) {
          const size = asset.fileSize || 0;
          if (size > 20 * 1024 * 1024) {
            showAlert({
              title: 'File Too Large',
              message: `One of your selected files is ${(size / (1024 * 1024)).toFixed(1)}MB. Individual files must be under 20MB.`,
              type: 'warning',
            });
            continue;
          }
          if (runningTotal + size > 50 * 1024 * 1024) {
            showAlert({
              title: '50MB Limit Exceeded',
              message: 'Cannot add this file. Total proof size for this post would exceed the 50MB limit.',
              type: 'warning',
            });
            break;
          }
          runningTotal += size;
          validNewItems.push({
            uri: asset.uri,
            fileSize: size,
            type: asset.type ?? undefined,
          });
        }

        if (validNewItems.length > 0) {
          setMediaList((prev) => [...prev, ...validNewItems].slice(0, 5));
        }
      }
    } catch (err: any) {
      showAlert({
        title: 'Media Picker',
        message: err.message || 'Could not pick photo/video.',
        type: 'warning',
      });
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      showAlert({
        title: 'Required Fields',
        message: 'Please provide an achievement title and reflection.',
        type: 'warning',
      });
      return;
    }

    if (!currentUser || !currentSquad) {
      showAlert({
        title: 'Notice',
        message: 'No active squad found. Please join or create a squad first.',
        type: 'info',
      });
      return;
    }

    try {
      setLoading(true);
      const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);

      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('squadId', currentSquad.id);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category.toUpperCase());
      if (totalMinutes > 0) {
        formData.append('timeSpentMin', totalMinutes.toString());
      }

      mediaList.forEach((item, idx) => {
        const filename = item.uri.split('/').pop() || `proof_${idx + 1}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match
          ? (item.type === 'video' ? `video/${match[1]}` : `image/${match[1]}`)
          : (item.type === 'video' ? 'video/mp4' : 'image/jpeg');
        formData.append('media', {
          uri: item.uri,
          name: filename,
          type,
        } as any);
      });

      const res = await achievementApi.create(formData);

      if (res.success) {
        await refreshSquadData();
        showAlert({
          title: '🎯 Achievement Verified!',
          message: `AI Verdict: ${res.evaluation?.aiVerdict || 'Solid Progress'}\nImpact Score: ${res.evaluation?.impactScore || 8}/10\n\n"${res.evaluation?.aiFeedback || 'Consistency noted.'}"`,
          type: 'success',
          icon: 'sparkles-outline',
          buttons: [{ text: 'Awesome', style: 'default', onPress: () => navigation?.goBack() }],
        });
      } else {
        showAlert({
          title: 'Saved',
          message: res.error || 'Saved to squad feed.',
          type: 'info',
          buttons: [{ text: 'OK', style: 'default', onPress: () => navigation?.goBack() }],
        });
      }
    } catch (err: any) {
      console.log('Error logging achievement:', err);
      showAlert({
        title: 'Submission Notice',
        message: err.response?.data?.error || err.message || 'Saved to feed.',
        type: 'info',
        buttons: [{ text: 'OK', style: 'default', onPress: () => navigation?.goBack() }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Modal Top Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation?.goBack()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>Log Achievement</Text>
        </View>

        {/* Big Question Title */}
        <Text style={styles.mainTitle}>What did you accomplish?</Text>

        {/* Title Input */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Completed DSA problems or 5km run"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Category Pills Grid */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, active && styles.categoryPillActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time Spent Selectors */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Time spent</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeDropdown}>
              <TextInput
                style={styles.timeNumberInput}
                placeholder="1"
                placeholderTextColor="#9ca3af"
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.timeUnitText}>hours</Text>
              <Text style={styles.timeChevron}>⌵</Text>
            </View>

            <View style={styles.timeDropdown}>
              <TextInput
                style={styles.timeNumberInput}
                placeholder="30"
                placeholderTextColor="#9ca3af"
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.timeUnitText}>minutes</Text>
              <Text style={styles.timeChevron}>⌵</Text>
            </View>
          </View>
        </View>

        {/* What happened (Reflection) */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>What happened? (Reflection)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe what you accomplished, key obstacles, and real progress made..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Proof (photo or video) */}
        <View style={styles.fieldBlock}>
          <View style={styles.proofHeaderRow}>
            <View>
              <Text style={styles.fieldLabel}>Proof (photos or videos)</Text>
              <Text style={styles.proofLimitNote}>Up to 5 items · 50MB max total</Text>
            </View>
            <View style={styles.counterBadge}>
              <Text style={styles.proofCounterText}>
                {mediaList.length}/5{totalBytes > 0 ? ` · ${totalMb} MB` : ''}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.proofRow}
            style={styles.proofScroll}
          >
            {mediaList.map((item, idx) => (
              <View key={idx} style={styles.mediaPreviewCard}>
                <Image source={{ uri: item.uri }} style={styles.mediaThumb} resizeMode="cover" />
                {item.fileSize ? (
                  <View style={styles.mediaSizePill}>
                    <Text style={styles.mediaSizeText}>
                      {(item.fileSize / (1024 * 1024)).toFixed(1)} MB
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.removeMediaBtn}
                  onPress={() => handleRemoveMedia(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeMediaText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {mediaList.length < 5 && (
              <TouchableOpacity
                style={styles.addMediaCard}
                onPress={pickMedia}
                activeOpacity={0.8}
              >
                <Text style={styles.addMediaPlus}>+</Text>
                <Text style={styles.addMediaLabel}>
                  {mediaList.length === 0 ? 'Add Photos/Videos' : `Add More (${5 - mediaList.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* AI Audit Notice Banner */}
        <View style={styles.aiAuditBanner}>
          <Text style={styles.aiAuditIcon}>✦</Text>
          <Text style={styles.aiAuditText}>
            Your squad will see this, and our AI will audit it against your goals.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Achievement  →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '600',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: '30%',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  timeNumberInput: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    minWidth: 24,
  },
  timeUnitText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  timeChevron: {
    fontSize: 12,
    color: '#6b7280',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
  },
  proofHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  proofLimitNote: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  counterBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  proofCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  proofScroll: {
    marginTop: 4,
  },
  proofRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 4,
  },
  mediaPreviewCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaSizePill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mediaSizeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  addMediaCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    paddingHorizontal: 10,
  },
  addMediaPlus: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '400',
    marginBottom: 4,
  },
  addMediaLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  aiAuditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  aiAuditIcon: {
    fontSize: 16,
    color: '#111827',
  },
  aiAuditText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
