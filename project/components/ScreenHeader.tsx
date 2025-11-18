import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  color: string;
  currentLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}

const LANGUAGES = [
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

export function ScreenHeader({ title, subtitle, onBack, color, currentLanguage = 'hi', onLanguageChange }: ScreenHeaderProps) {
  const [isOffline] = useState(true); // Simulating offline mode
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const colorMap: Record<string, string> = {
    'bg-indigo-400': '#818CF8',
    'bg-sky-400': '#38BDF8',
    'bg-emerald-400': '#34D399',
    'bg-purple-400': '#A78BFA',
    'bg-red-400': '#F87171',
  };

  return (
    <View style={[styles.header, { backgroundColor: colorMap[color] || '#818CF8' }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessible={true}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.rightButtons}>
          {/* Offline Indicator */}
          <View style={styles.offlineIndicator}>
            <Text style={styles.offlineIcon}>{isOffline ? '📡' : '📶'}</Text>
            <Text style={styles.offlineText}>
              {isOffline ? 'Offline Mode' : 'Online'}
            </Text>
          </View>

          {/* Language Selector */}
          <TouchableOpacity 
            style={styles.languageButton}
            onPress={() => setShowLanguageModal(true)}
            accessible={true}
            accessibilityLabel="Change language"
          >
            <Text style={styles.languageIcon}>🌐</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.languageList}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === lang.code && styles.languageOptionSelected
                  ]}
                  onPress={() => {
                    onLanguageChange?.(lang.code);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageLabel,
                    currentLanguage === lang.code && styles.languageLabelSelected
                  ]}>
                    {lang.label}
                  </Text>
                  {currentLanguage === lang.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  offlineIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  languageButton: {
    padding: 8,
  },
  languageIcon: {
    fontSize: 20,
  },
  titleContainer: {
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  languageList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  languageOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  languageLabelSelected: {
    fontWeight: '600',
    color: '#0EA5E9',
  },
  checkmark: {
    fontSize: 20,
    color: '#0EA5E9',
    fontWeight: '700',
  },
});
