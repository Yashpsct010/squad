import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertConfig {
  title: string;
  message?: string;
  type?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  icon?: any;
  buttons?: AlertButton[];
}

interface CustomAlertModalProps {
  config: AlertConfig | null;
  onClose: () => void;
}

export default function CustomAlertModal({ config, onClose }: CustomAlertModalProps) {
  if (!config) return null;

  const { title, message, type = 'default', icon, buttons } = config;

  // Determine icon & color palette based on type
  let iconName: any = icon || 'information-circle-outline';
  let iconColor = '#111827';
  let iconBg = '#f3f4f6';

  if (type === 'success') {
    iconName = icon || 'checkmark-circle-outline';
    iconColor = '#15803d';
    iconBg = '#dcfce7';
  } else if (type === 'destructive') {
    iconName = icon || 'alert-circle-outline';
    iconColor = '#dc2626';
    iconBg = '#fee2e2';
  } else if (type === 'warning') {
    iconName = icon || 'warning-outline';
    iconColor = '#d97706';
    iconBg = '#fef3c7';
  } else if (type === 'info') {
    iconName = icon || 'shield-checkmark-outline';
    iconColor = '#2563eb';
    iconBg = '#dbeafe';
  }

  // Default to a single "OK" button if none provided
  const actionButtons: AlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }];

  const handlePress = (btn: AlertButton) => {
    onClose();
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 100);
    }
  };

  return (
    <Modal
      visible={!!config}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Top Icon Badge */}
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={28} color={iconColor} />
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Button Row / Column */}
          <View
            style={[
              styles.buttonContainer,
              actionButtons.length > 2 ? styles.buttonColumn : styles.buttonRow,
            ]}
          >
            {actionButtons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              let btnStyle: any = styles.defaultBtn;
              let textStyle: any = styles.defaultBtnText;

              if (isCancel) {
                btnStyle = styles.cancelBtn;
                textStyle = styles.cancelBtnText;
              } else if (isDestructive) {
                btnStyle = styles.destructiveBtn;
                textStyle = styles.destructiveBtnText;
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.baseBtn,
                    btnStyle,
                    actionButtons.length === 2 && { flex: 1 },
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.85}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  baseBtn: {
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  defaultBtn: {
    backgroundColor: '#111827',
  },
  defaultBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#f3f4f6',
  },
  cancelBtnText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveBtn: {
    backgroundColor: '#ef4444',
  },
  destructiveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
