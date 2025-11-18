import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import { LLMService, Message as LLMMessage } from '../services/LLMService';
import { WhisperService, SupportedLanguage } from '../services/WhisperService';
import { AudioRecorder } from '../components/AudioRecorder';

interface Message {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface GeneralScreenProps {
  onBack: () => void;
  llmService: LLMService;
  whisperService: WhisperService;
}

const systemPrompt = `You are Sahay, a helpful AI assistant specialized in general conversations. You can speak multiple Indian languages including Hindi, English, Malayalam, Kannada, Tamil, Telugu, Bengali, Gujarati, Marathi, and Punjabi. Be friendly, concise, and helpful in your responses. When the user speaks in a specific language, respond in that same language.`;

const initialMessages: Message[] = [
  {
    id: 1,
    type: 'assistant',
    content: 'Namaste! मैं आपकी सहायता के लिए यहाँ हूँ। I\'m your AI companion and I speak multiple languages. You can ask me about daily tasks, general knowledge, advice, or anything you need help with!',
    timestamp: new Date(),
  },
];

const quickQuestions = [
  { icon: 'lightbulb-outline', text: 'What is the meaning of life?', emoji: '💡' },
  { icon: 'weather-sunny', text: 'Tips for staying productive', emoji: '☀️' },
  { icon: 'book-open-variant', text: 'Recommend a good book', emoji: '📚' },
  { icon: 'earth', text: 'Facts about India', emoji: '🌍' },
  { icon: 'pen', text: 'How to write better?', emoji: '✍️' },
  { icon: 'translate', text: 'Teach me a new word', emoji: '🗣️' },
];

export function GeneralScreen({ onBack, llmService, whisperService }: GeneralScreenProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;

    await handleSendText(inputText.trim(), false);
    setInputText('');
  };

  const handleSendText = async (text: string, isVoiceInput: boolean) => {
    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      content: text,
      timestamp: new Date(),
      isVoice: isVoiceInput,
    };

    setMessages(prev => [...prev, userMessage]);
    setShowQuickQuestions(false);
    setIsGenerating(true);

    try {
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.type === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.content,
        })),
        { role: 'user', content: text },
      ];

      let fullResponse = '';
      const assistantMessage: Message = {
        id: messages.length + 2,
        type: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      await llmService.generateResponse(llmMessages, (token: string) => {
        fullResponse += token;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullResponse,
          };
          return updated;
        });
      });
    } catch (error) {
      console.error('Chat error:', error);
      Alert.alert('Error', 'Failed to get response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
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

      try {
        await RNFS.unlink(audioPath);
      } catch (err) {
        console.warn('Failed to delete audio file:', err);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      Alert.alert('Transcription Error', 'Failed to convert speech to text. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Icon name="chat" size={24} color="#FFFFFF" />
            <Text style={styles.headerText}>General Chat</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Quick Questions */}
        {showQuickQuestions && messages.length <= 1 && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={styles.quickQuestionsTitle}>💬 Quick questions to get started</Text>
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

        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.type === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.type === 'user' ? styles.userMessage : styles.assistantMessage,
              ]}
            >
              {message.isVoice && (
                <View style={styles.voiceBadge}>
                  <Icon name="microphone" size={12} color="#6366F1" />
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  message.type === 'user' ? styles.userMessageText : styles.assistantMessageText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        ))}
        {(isGenerating || isTranscribing) && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingDot} />
            <View style={[styles.typingDot, styles.typingDotDelay1]} />
            <View style={[styles.typingDot, styles.typingDotDelay2]} />
            <Text style={styles.typingText}>
              {isTranscribing ? 'Transcribing...' : 'Thinking...'}
            </Text>
          </View>
        )}
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
          // Text Input Mode
          <>
            <TouchableOpacity
              onPress={() => setIsVoiceMode(true)}
              style={styles.modeButton}
              disabled={isGenerating || isTranscribing}
            >
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
                colors={!inputText.trim() || isGenerating || isTranscribing ? ['#D1D5DB', '#D1D5DB'] : ['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButtonGradient}
              >
                <Icon name="send" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          // Voice Input Mode
          <>
            <TouchableOpacity
              onPress={() => setIsVoiceMode(false)}
              style={styles.modeButton}
              disabled={isGenerating || isTranscribing}
            >
              <Icon name="keyboard" size={24} color="#6B7280" />
            </TouchableOpacity>
            <View style={styles.voiceButtonContainer}>
              <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                isProcessing={isTranscribing}
                disabled={isGenerating}
                fullWidth={true}
              />
            </View>
            <TouchableOpacity
              style={styles.modeButton}
              disabled={true}
            >
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
    backgroundColor: '#F9FAFB',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userMessage: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#374151',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 16,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  typingDotDelay1: {
    opacity: 0.7,
  },
  typingDotDelay2: {
    opacity: 0.4,
  },
  typingText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  quickQuestionsContainer: {
    padding: 16,
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
