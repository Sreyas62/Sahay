import React, { useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler, Text } from 'react-native';
import RNFS from 'react-native-fs';
import { SplashScreen } from './src/screens/SplashScreen';
import { ModelDownloadScreen } from './src/screens/ModelDownloadScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { GeneralScreen } from './src/screens/GeneralScreen';
import { EducationScreen } from './project/components/screens/EducationScreen';
import { FrontlineScreen } from './project/components/screens/FrontlineScreen';
import { LegalScreen } from './project/components/screens/LegalScreen';
import { HealthScreen } from './project/components/screens/HealthScreen';
import { LLMService } from './src/services/LLMService';
import { WhisperService } from './src/services/WhisperService';


type Screen = 'splash' | 'download' | 'onboarding' | 'home' | 'category';
type Category = 'general' | 'education' | 'frontline' | 'legal' | 'health';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [llmService, setLlmService] = useState<LLMService | null>(null);
  const [whisperService, setWhisperService] = useState<WhisperService | null>(null);
  const [hasShownOnboarding, setHasShownOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isFromSettings, setIsFromSettings] = useState(false);

  useEffect(() => {
    // Check app state and navigate accordingly after splash
    if (currentScreen === 'splash') {
      const timer = setTimeout(async () => {
        await checkAppState();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const checkAppState = async () => {
    try {
      // Check if models exist
      const llmPath = `${RNFS.DocumentDirectoryPath}/sarvam-1.Q8_0.gguf`;
      const whisperPath = `${RNFS.DocumentDirectoryPath}/ggml-large-v3-turbo-q5_0.bin`;
      
      const llmExists = await RNFS.exists(llmPath);
      const whisperExists = await RNFS.exists(whisperPath);
      const modelsExist = llmExists && whisperExists;

      if (!modelsExist) {
        // Models not found, show onboarding then download screen (first time user)
        console.log('Models not found, showing onboarding');
        setHasShownOnboarding(true);
        setCurrentScreen('onboarding');
      } else {
        // Models exist, initialize services and go directly to home
        console.log('Models found, initializing services');
        // Keep splash screen visible during initialization
        try {
          const llm = new LLMService(llmPath);
          const whisper = new WhisperService(whisperPath);
          
          // Parallelize initialization for faster loading
          await Promise.all([
            llm.initialize(),
            whisper.initialize()
          ]);
          
          setLlmService(llm);
          setWhisperService(whisper);
          
          console.log('Services initialized successfully, going to home');
          setCurrentScreen('home');
        } catch (error) {
          console.error('Failed to initialize services:', error);
          // If initialization fails, go to download screen to re-download
          setCurrentScreen('download');
        }
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setCurrentScreen('download');
    }
  };

  useEffect(() => {
    // Handle Android hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'category') {
        // Go back to home from category screens
        handleBack();
        return true; // Prevent default behavior
      } else if (currentScreen === 'home') {
        // Exit app from home screen
        return false; // Allow default behavior (exit)
      } else if (currentScreen === 'download' || currentScreen === 'onboarding') {
        // Prevent going back during setup
        return true; // Block back button
      }
      return false;
    });

    return () => backHandler.remove();
  }, [currentScreen, selectedCategory]);

  const handleModelsDownloaded = async () => {
    // If coming from settings, go back to home instead of splash
    if (isFromSettings) {
      setIsFromSettings(false);
      setCurrentScreen('home');
      return;
    }
    
    // Show splash screen during initialization
    setCurrentScreen('splash');
    
    try {
      // Initialize services with downloaded models (match ModelSetup file names)
      const llmPath = `${RNFS.DocumentDirectoryPath}/sarvam-1.Q8_0.gguf`;
      const whisperPath = `${RNFS.DocumentDirectoryPath}/ggml-large-v3-turbo-q5_0.bin`;
      
      const llm = new LLMService(llmPath);
      const whisper = new WhisperService(whisperPath);
      
      // Parallelize initialization for faster loading
      await Promise.all([
        llm.initialize(),
        whisper.initialize()
      ]);
      
      setLlmService(llm);
      setWhisperService(whisper);
      
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
    
    // After models downloaded, go directly to home (onboarding already shown)
    setCurrentScreen('home');
  };

  const handleOnboardingComplete = () => {
    // After onboarding, check if we need to download models
    if (!llmService || !whisperService) {
      setCurrentScreen('download');
    } else {
      setCurrentScreen('home');
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setCurrentScreen('category');
  };

  const handleBack = () => {
    setCurrentScreen('home');
    setSelectedCategory(null);
  };

  const handleSettings = () => {
    setIsFromSettings(true);
    setCurrentScreen('download');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onComplete={() => {}} />;
      
      case 'download':
        return <ModelDownloadScreen onComplete={handleModelsDownloaded} showDownloaded={isFromSettings} />;
      
      case 'onboarding':
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
      
      case 'home':
        return <HomeScreen onSelectCategory={handleCategorySelect} onSettings={handleSettings} />;
      
      case 'category':
        if (!llmService || !whisperService) {
          return <HomeScreen onSelectCategory={handleCategorySelect} onSettings={handleSettings} />;
        }
        
        switch (selectedCategory) {
          case 'general':
            return <GeneralScreen onBack={handleBack} llmService={llmService} whisperService={whisperService} />;
          case 'education':
            return <EducationScreen onBack={handleBack} llmService={llmService} whisperService={whisperService} />;
          case 'frontline':
            return <FrontlineScreen onBack={handleBack} llmService={llmService} whisperService={whisperService} />;
          case 'legal':
            return <LegalScreen onBack={handleBack} llmService={llmService} whisperService={whisperService} />;
          case 'health':
            return <HealthScreen onBack={handleBack} llmService={llmService} whisperService={whisperService} />;
          default:
            return <HomeScreen onSelectCategory={handleCategorySelect} onSettings={handleSettings} />;
        }
      
      default:
        return <SplashScreen onComplete={() => {}} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default App;
