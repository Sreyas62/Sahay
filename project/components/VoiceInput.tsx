import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { AudioRecorder } from '../../src/components/AudioRecorder';

interface VoiceInputProps {
  isRecording: boolean;
  onToggle: (audioPath?: string) => void;
  placeholder: string;
  onSendText?: (text: string) => void;
  isProcessing?: boolean;
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

export function VoiceInput({ isRecording, onToggle, placeholder, onSendText, isProcessing = false, currentLanguage = 'hi', onLanguageChange }: VoiceInputProps) {
  const [showTextInput, setShowTextInput] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [textInput, setTextInput] = useState('');

  const handleSend = () => {
    if (textInput.trim() && onSendText) {
      onSendText(textInput.trim());
      setTextInput('');
      setShowTextInput(false);
    }
  };

  const handleAudioRecorded = (audioPath: string) => {
    onToggle(audioPath);
  };

  return (
    <View style={styles.container}>
      {showTextInput ? (
        // Text Input Mode
        <View style={styles.inputRow}>
          <TouchableOpacity
            onPress={() => setShowTextInput(false)}
            style={styles.toggleButton}
            accessible={true}
            accessibilityLabel="Switch to voice input"
          >
            <Text style={styles.toggleIcon}>🎤</Text>
          </TouchableOpacity>
          <TextInput
            value={textInput}
            onChangeText={setTextInput}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!textInput.trim()}
            style={[styles.sendButton, !textInput.trim() && styles.sendButtonDisabled]}
            accessible={true}
            accessibilityLabel="Send message"
          >
            <Text style={styles.sendIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Voice Input Mode
        <View style={styles.voiceContainer}>
          <TouchableOpacity
            onPress={() => setShowTextInput(true)}
            style={styles.toggleButton}
            accessible={true}
            accessibilityLabel="Switch to text input"
          >
            <Text style={styles.toggleIcon}>⌨️</Text>
          </TouchableOpacity>

          {/* Audio Recorder */}
          <View style={styles.recorderContainer}>
            <AudioRecorder
              onAudioRecorded={handleAudioRecorded}
              isProcessing={isProcessing}
            />
            <Text style={styles.instructionText}>
              {isProcessing ? 'Processing...' : 'Tap microphone to speak'}
            </Text>
          </View>

          {/* Language Badge */}
          <TouchableOpacity 
            style={styles.languageBadge}
            onPress={() => setShowLanguageModal(true)}
            accessible={true}
            accessibilityLabel="Change language"
          >
            <Text style={styles.languageText}>
              {LANGUAGES.find(l => l.code === currentLanguage)?.label.substring(0, 3) || 'हिं'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    padding: 8,
  },
  toggleIcon: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#0EA5E9',
    padding: 10,
    borderRadius: 24,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recorderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  instructionText: {
    color: '#6B7280',
    fontSize: 14,
  },
  languageBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  languageText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
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
