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
import { ChatHistoryService, Chat } from '../../../src/services/ChatHistoryService';
import { ChatHistoryList } from '../../../src/components/ChatHistoryList';

type Message = {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
};

const quickActions = [
  { id: 1, icon: '🚨', label: 'Report Scam', color: 'bg-red-100 text-red-600' },
  { id: 2, icon: '⚖️', label: 'Legal Rights', color: 'bg-purple-100 text-purple-600' },
  { id: 3, icon: '📞', label: 'Helplines', color: 'bg-blue-100 text-blue-600' },
  { id: 4, icon: '🛡️', label: 'Stay Safe', color: 'bg-indigo-100 text-indigo-600' }
];

const initialMessages: Message[] = [
  {
    id: 1,
    type: 'assistant',
    content: 'Welcome to Legal & Fraud Protection! I can help you recognize scams, understand your rights, and connect with verified support services.',
    timestamp: new Date()
  }
];

interface LegalScreenProps {
  onBack: () => void;
  llmService: LLMService;
  whisperService: WhisperService;
}

export function LegalScreen({ onBack, llmService, whisperService }: LegalScreenProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('hi');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  React.useEffect(() => { loadChatHistory(); }, []);
  React.useEffect(() => { if (messages.length > 1 && currentChatId) { saveCurrentChat(); } }, [messages]);

  const loadChatHistory = async () => {
    try { const chats = await ChatHistoryService.getAllChats('legal'); setChatHistory(chats); }
    catch (error) { console.error('Error loading chat history:', error); }
  };
  const saveCurrentChat = async () => {
    if (!currentChatId || messages.length <= 1) return;
    try { await ChatHistoryService.updateChatMessages('legal', currentChatId, messages); await loadChatHistory(); }
    catch (error) { console.error('Error saving chat:', error); }
  };
  const createNewChat = async () => { setMessages(initialMessages); setCurrentChatId(null); setShowHistory(false); };
  const loadChat = async (chatId: string) => {
    try {
      const chat = await ChatHistoryService.getChat('legal', chatId);
      if (chat) { setMessages(chat.messages.length > 0 ? chat.messages : initialMessages); setSelectedLanguage(chat.language as SupportedLanguage); setCurrentChatId(chat.id); setShowHistory(false); }
    } catch (error) { console.error('Error loading chat:', error); Alert.alert('Error', 'Failed to load chat'); }
  };
  const deleteChat = async (chatId: string) => {
    try { await ChatHistoryService.deleteChat('legal', chatId); await loadChatHistory(); if (currentChatId === chatId) { createNewChat(); } }
    catch (error) { console.error('Error deleting chat:', error); Alert.alert('Error', 'Failed to delete chat'); }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;
    
    const textToSend = inputText.trim();
    // Clear input immediately before async operation
    setInputText('');
    
    await handleSendText(textToSend, false);
    
    // Ensure input stays focused
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 100);
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

  const handleQuickAction = (label: string) => {
    handleSendText(`I need help with ${label.toLowerCase()}`);
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

  // Legal-specific prompts with language support
  const getSystemPrompt = (language: SupportedLanguage): string => {
    const prompts = {
      'en': 'You are a legal awareness assistant. IMPORTANT: Respond ONLY in English. Help identify scams, explain rights in English. Helplines: Cyber 1930, Women 1091.',
      'hi': 'आप कानूनी जागरूकता सहायक हैं। महत्वपूर्ण: केवल हिंदी में उत्तर दें। धोखाधड़ी पहचानें, अधिकार हिंदी में बताएं। हेल्पलाइन: 1930, 1091।',
      'ml': 'നിങ്ങൾ നിയമ അവബോധ സഹായിയാണ്. പ്രധാനം: മലയാളത്തിൽ മാത്രം മറുപടി നൽകുക. വഞ്ചന തിരിച്ചറിയാൻ മലയാളത്തിൽ സഹായിക്കുക. ഹെൽപ്പ്‌ലൈൻ: 1930, 1091.',
      'kn': 'ನೀವು ಕಾನೂನು ಜಾಗೃತಿ ಸಹಾಯಕರು. ಮುಖ್ಯ: ಕೇವಲ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ. ವಂಚನೆ ಗುರುತಿಸಿ ಮತ್ತು ಹಕ್ಕುಗಳನ್ನು ಕನ್ನಡದಲ್ಲಿ ತಿಳಿಸಿ. ಹೆಲ್ಪ್‌ಲೈನ್: 1930, 1091.',
      'auto': 'Legal awareness assistant. Identify scams and explain rights. Helplines: 1930, 1091. Use user language.'
    };
    return prompts[language] || prompts['auto'];
  };

  const handleSendText = async (text: string, isVoice: boolean = false) => {
    if (!text.trim() || isGenerating) return;
    const userMessage: Message = { id: messages.length + 1, type: 'user', content: text, timestamp: new Date(), isVoice };
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    if (!currentChatId) {
      try { const newChat = await ChatHistoryService.createChat('legal', text, selectedLanguage); setCurrentChatId(newChat.id); }
      catch (error) { console.error('Error creating chat:', error); }
    }
    const assistantMessageId = messages.length + 2;
    setMessages(prev => [...prev, { id: assistantMessageId, type: 'assistant', content: '', timestamp: new Date() }]);
    try {
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: getSystemPrompt(selectedLanguage) },
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
        colors={['#EC4899', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Icon name="gavel" size={24} color="#FFFFFF" />
            <Text style={styles.headerText}>Legal Help</Text>
          </View>
          <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.historyButton}>
            <Icon name="history" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>How can I protect you?</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            {quickActions.map((action) => (
              <View key={action.id} style={styles.quickActionItem}>
                <QuickAction
                  icon={action.icon}
                  label={action.label}
                  color={action.color}
                  onClick={() => handleQuickAction(action.label)}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.messagesContainer}>
          {messages.map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
        </View>
      </ScrollView>

      {/* Language Selector */}
      <View style={styles.languageSelectorContainer}>
        <Text style={styles.languageLabel}>Response Language:</Text>
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
                ref={textInputRef}
                style={styles.textInput}
                placeholder="Type your message..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={true}
                autoFocus={false}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isGenerating || isTranscribing}
              style={[styles.sendButton, (!inputText.trim() || isGenerating || isTranscribing) && styles.sendButtonDisabled]}
            >
              <LinearGradient
                colors={!inputText.trim() || isGenerating || isTranscribing ? ['#D1D5DB', '#D1D5DB'] : ['#EC4899', '#F97316']}
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

      {showHistory && (
        <ChatHistoryList
          chats={chatHistory}
          onClose={() => setShowHistory(false)}
          onNewChat={createNewChat}
          onSelectChat={loadChat}
          onDeleteChat={deleteChat}
        />
      )}
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
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quickActionsSection: {
    paddingVertical: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  quickActionsScroll: {
    gap: 8,
  },
  quickActionItem: {
    marginRight: 8,
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
