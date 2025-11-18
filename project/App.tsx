import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { Header } from './components/Header';
import { CategoryGrid } from './components/CategoryGrid';
import { BottomNav } from './components/BottomNav';
import { GeneralScreen } from './components/screens/GeneralScreen';
import { EducationScreen } from './components/screens/EducationScreen';
import { FrontlineScreen } from './components/screens/FrontlineScreen';
import { LegalScreen } from './components/screens/LegalScreen';
import { HealthScreen } from './components/screens/HealthScreen';
import { LLMService } from './services/LLMService';
import { WhisperService } from './services/WhisperService';

type Screen = 'home' | 'general' | 'education' | 'frontline' | 'legal' | 'health';

interface MainAppProps {
  onShowModelManagement: () => void;
}

export default function MainApp({ onShowModelManagement }: MainAppProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [llmService, setLlmService] = useState<LLMService | null>(null);
  const [whisperService, setWhisperService] = useState<WhisperService | null>(null);
  const [servicesReady, setServicesReady] = useState(false);

  useEffect(() => {
    initializeServices();
    
    // Cleanup on unmount
    return () => {
      if (llmService) {
        llmService.release();
      }
      if (whisperService) {
        whisperService.release();
      }
    };
  }, []);

  const initializeServices = async () => {
    console.log('=== Starting service initialization ===');
    try {
      // Initialize LLM
      const llmPath = `${RNFS.DocumentDirectoryPath}/sarvam-1.Q8_0.gguf`;
      console.log('LLM Path:', llmPath);
      
      const llmExists = await RNFS.exists(llmPath);
      console.log('LLM file exists:', llmExists);
      
      if (!llmExists) {
        throw new Error('LLM model file not found. Please download it first.');
      }
      
      const llm = new LLMService(llmPath);
      console.log('Initializing LLM...');
      await llm.initialize();
      console.log('LLM initialized, is ready:', llm.isReady());
      setLlmService(llm);
      console.log('LLM Service set in state');

      // Initialize Whisper
      const whisperPath = `${RNFS.DocumentDirectoryPath}/ggml-large-v3-turbo-q5_0.bin`;
      console.log('Whisper Path:', whisperPath);
      
      const whisperExists = await RNFS.exists(whisperPath);
      console.log('Whisper file exists:', whisperExists);
      
      if (!whisperExists) {
        console.warn('Whisper model not found, voice input will be disabled');
      } else {
        const whisper = new WhisperService(whisperPath, 'hi');
        console.log('Initializing Whisper...');
        await whisper.initialize();
        console.log('Whisper initialized, is ready:', whisper.isReady());
        setWhisperService(whisper);
        console.log('Whisper Service set in state');
      }

      setServicesReady(true);
      console.log('=== Service initialization complete ===');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      Alert.alert(
        'Initialization Error', 
        `Failed to load AI models: ${error}\n\nPlease ensure models are downloaded.`
      );
    }
  };

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    if (!servicesReady || !llmService) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing AI models...</Text>
        </View>
      );
    }

    switch (currentScreen) {
      case 'general':
        return <GeneralScreen onBack={() => handleNavigate('home')} llmService={llmService} whisperService={whisperService!} />;
      case 'education':
        return <EducationScreen onBack={() => handleNavigate('home')} llmService={llmService} whisperService={whisperService!} />;
      case 'frontline':
        return <FrontlineScreen onBack={() => handleNavigate('home')} llmService={llmService} whisperService={whisperService!} />;
      case 'legal':
        return <LegalScreen onBack={() => handleNavigate('home')} llmService={llmService} whisperService={whisperService!} />;
      case 'health':
        return <HealthScreen onBack={() => handleNavigate('home')} llmService={llmService} whisperService={whisperService!} />;
      default:
        return (
          <View style={styles.homeContainer}>
            <Header onShowModelManagement={onShowModelManagement} />
            <View style={styles.mainContent}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingTitle}>
                  Namaste!{'\n'}
                  How can I help you today?
                </Text>
                <Text style={styles.greetingSubtitle}>Hello, [User Name]</Text>
              </View>
              <CategoryGrid onSelectCategory={handleNavigate} />
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.appContent}>
        {renderScreen()}
        
        {/* Bottom Navigation */}
        <BottomNav activeScreen={currentScreen} onNavigate={handleNavigate} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appContent: {
    flex: 1,
  },
  homeContainer: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  greetingContainer: {
    marginBottom: 32,
  },
  greetingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 38,
  },
  greetingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
});