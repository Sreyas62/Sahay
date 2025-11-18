import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Platform, TouchableOpacity, TextInput, KeyboardAvoidingView } from 'react-native';
import RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScreenHeader } from '../ScreenHeader';
import { ChatMessage } from '../ChatMessage';
import { AudioRecorder } from '../../../src/components/AudioRecorder';
import { QuickAction } from '../QuickAction';
import { LLMService, Message as LLMMessage } from '../../../src/services/LLMService';
import { WhisperService, SupportedLanguage } from '../../../src/services/WhisperService';

type Message = {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
};

const quickQuestions = [
  { emoji: '🔥', text: 'How to treat a burn?' },
  { emoji: '🩹', text: 'First aid for cuts' },
  { emoji: '🤒', text: 'When to worry about fever?' },
  { emoji: '🐍', text: 'Snake bite emergency steps' },
  { emoji: '💊', text: 'Common medicines guide' },
  { emoji: '🧼', text: 'Hygiene and sanitation tips' },
];

const initialMessages: Message[] = [
  {
    id: 1,
    type: 'assistant',
    content: 'Welcome to Health & First Aid! I can help with first aid, symptoms, medicine info, and health tips. For emergencies, always call 108.',
    timestamp: new Date()
  }
];

interface HealthScreenProps {
  onBack: () => void;
  llmService: LLMService;
  whisperService: WhisperService;
}

export function HealthScreen({ onBack, llmService, whisperService }: HealthScreenProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('hi');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('hi');
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;
    await handleSendText(inputText.trim(), false);
    setInputText('');
  };

  const handleAudioRecorded = async (audioPath: string) => {
    setIsTranscribing(true);
    try {
      let whisperPath = audioPath;
      if (Platform.OS === 'android' && !audioPath.startsWith('file://')) {
        whisperPath = `file://${audioPath}`;
      }
      const transcription = await whisperService.transcribe(whisperPath, {
        language: selectedLanguage,
        speedUp: true,
      });
      if (transcription && transcription.trim()) {
        await handleSendText(transcription, true);
      } else {
        Alert.alert('No Speech Detected', 'Please try speaking again.');
      }
      try { await RNFS.unlink(audioPath); } catch (err) { }
    } catch (error) {
      Alert.alert('Transcription Error', 'Failed to convert speech to text.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVoiceToggle = async (audioPath?: string) => {
    if (audioPath) {
      setIsTranscribing(true);
      try {
        let whisperPath = audioPath;
        if (Platform.OS === 'android' && !audioPath.startsWith('file://')) { whisperPath = `file://${audioPath}`; }
        const transcription = await whisperService.transcribe(whisperPath, {
          language: selectedLanguage,
          speedUp: true,
        });
        if (transcription && transcription.trim()) { await handleSendText(transcription, true); }
        else { Alert.alert('No Speech Detected', 'Please try speaking again.'); }
        try { await RNFS.unlink(audioPath); } catch (err) {}
      } catch (error) { Alert.alert('Transcription Error', 'Failed to convert speech to text.'); }
      finally { setIsTranscribing(false); setIsRecording(false); }
    } else { setIsRecording(!isRecording); }
  };

  const handleSendText = async (text: string, isVoice: boolean = false) => {
    if (!text.trim() || isGenerating) return;
    const userMessage: Message = { id: messages.length + 1, type: 'user', content: text, timestamp: new Date(), isVoice };
    setMessages(prev => [...prev, userMessage]);
    setShowQuickQuestions(false);
    setIsGenerating(true);
    const assistantMessageId = messages.length + 2;
    setMessages(prev => [...prev, { id: assistantMessageId, type: 'assistant', content: '', timestamp: new Date() }]);
    try {
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: 'You are a health assistant for Indian users. Provide guidance on symptoms, first aid, medicines, and healthcare. Always remind users to call 108 for emergencies. Respond in Hindi and English.' },
        ...messages.slice(1).map(msg => ({ role: msg.type as 'user' | 'assistant', content: msg.content })),
        { role: 'user', content: text }
      ];
      let fullResponse = '';
      await llmService.generateResponse(llmMessages, (token) => { fullResponse += token; setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: fullResponse } : msg)); });
    } catch (error) { Alert.alert('Error', 'Failed to generate response.'); setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: 'Sorry, error occurred.' } : msg)); }
    finally { setIsGenerating(false); }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={['#F97316', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Icon name="heart-pulse" size={24} color="#FFFFFF" />
            <Text style={styles.headerText}>Health & Wellness</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <View style={styles.emergencyBanner}>
        <Text style={styles.emergencyIcon}></Text>
        <View style={styles.emergencyContent}>
          <Text style={styles.emergencyTitle}>Emergency?</Text>
          <Text style={styles.emergencyText}>Call 108 immediately for medical emergencies</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick Questions */}
        {showQuickQuestions && messages.length <= 1 && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={styles.quickQuestionsTitle}>🏥 Quick questions to get started</Text>
            <View style={styles.quickQuestionsGrid}>
              {quickQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickQuestionCard}
                  onPress={() => handleSendText(question.text, false)}
                  disabled={isGenerating}
                >
                  <Text style={styles.quickQuestionEmoji}>{question.emoji}</Text>
                  <Text style={styles.quickQuestionText}>{question.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.messagesContainer}>
          {messages.map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
        </View>
      </ScrollView>

      {/* Language Selector */}
      <View style={styles.languageSelectorContainer}>
        <Text style={styles.languageLabel}>Voice Language:</Text>
        <View style={styles.languageButtons}>
          {(['en', 'hi', 'ml', 'kn'] as SupportedLanguage[]).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageButton,
                selectedLanguage === lang && styles.selectedLanguageButton,
              ]}
              onPress={() => {
                setSelectedLanguage(lang);
                whisperService.setDefaultLanguage(lang);
              }}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  selectedLanguage === lang && styles.selectedLanguageButtonText,
                ]}
              >
                {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : lang === 'ml' ? 'മലയാളം' : 'ಕನ್ನಡ'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        {!isVoiceMode ? (
          <>
            <TouchableOpacity onPress={() => setIsVoiceMode(true)} style={styles.modeButton} disabled={isGenerating || isTranscribing}>
              <Icon name="microphone" size={24} color="#6B7280" />
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your message..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isGenerating && !isTranscribing}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isGenerating || isTranscribing}
              style={[styles.sendButton, (!inputText.trim() || isGenerating || isTranscribing) && styles.sendButtonDisabled]}
            >
              <LinearGradient
                colors={!inputText.trim() || isGenerating || isTranscribing ? ['#D1D5DB', '#D1D5DB'] : ['#F97316', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButtonGradient}
              >
                <Icon name="send" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setIsVoiceMode(false)} style={styles.modeButton} disabled={isGenerating || isTranscribing}>
              <Icon name="keyboard" size={24} color="#6B7280" />
            </TouchableOpacity>
            <View style={styles.voiceButtonContainer}>
              <AudioRecorder onAudioRecorded={handleAudioRecorded} isProcessing={isTranscribing} disabled={isGenerating} fullWidth={true} />
            </View>
            <TouchableOpacity style={styles.modeButton} disabled={true}>
              <Icon name="text" size={24} color="transparent" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: 70,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  emergencyBanner: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  emergencyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 2,
  },
  emergencyText: {
    fontSize: 14,
    color: '#B91C1C',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quickQuestionsContainer: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  quickQuestionsGrid: {
    gap: 8,
  },
  quickQuestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickQuestionEmoji: {
    fontSize: 20,
  },
  quickQuestionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  messagesContainer: {
    gap: 16,
  },
  languageSelectorContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedLanguageButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  languageButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedLanguageButtonText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
    alignItems: 'center',
  },
  modeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
  },
  voiceButtonContainer: {
    flex: 1,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
