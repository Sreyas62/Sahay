import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';

// Dynamic import to handle RNFS initialization issues
let RNFS: any = null;
try {
  RNFS = require('react-native-fs');
} catch (error) {
  console.error('Failed to load react-native-fs:', error);
}

import RNBackgroundDownloader from '@kesha-antonov/react-native-background-downloader';

interface ModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
  downloaded: boolean;
  downloading: boolean;
  paused: boolean;
  progress: number;
  error?: string;
  jobId?: number;
}

interface ModelSetupProps {
  onComplete: () => void;
  showDownloaded?: boolean;
}

export function ModelSetup({ onComplete, showDownloaded = false }: ModelSetupProps) {
  // Check if RNFS is properly initialized
  if (!RNFS || !RNFS.DocumentDirectoryPath) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>File system not initialized. Please restart the app.</Text>
        </View>
      </View>
    );
  }

  const [models, setModels] = useState<ModelInfo[]>([
    {
      id: 'sarvam',
      name: 'Sarvam LLM',
      size: '2.5 GB',
      description: 'Main AI model for conversations in Indian languages',
      downloaded: false,
      downloading: false,
      paused: false,
      progress: 0,
    },
    {
      id: 'whisper',
      name: 'Whisper STT',
      size: '547 MB',
      description: 'Speech-to-text model for voice input',
      downloaded: false,
      downloading: false,
      paused: false,
      progress: 0,
    },
  ]);

  const [isChecking, setIsChecking] = useState(true);
  const downloadTasksRef = useRef<Map<string, any>>(new Map());
  const appState = useRef(AppState.currentState);
  const modelsRef = useRef(models);

  // Check if models are already downloaded
  useEffect(() => {
    checkExistingDownloads();
    
    // Handle app state changes for background downloads
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Keep modelsRef in sync
  useEffect(() => {
    modelsRef.current = models;
  }, [models]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground, only check file sizes, don't re-attach handlers
      console.log('App returned to foreground, checking file sizes only');
      checkExistingModels();
    }
    appState.current = nextAppState;
  };

  const checkExistingDownloads = async () => {
    setIsChecking(true);
    
    try {
      // Check for any ongoing downloads from previous session
      const lostTasks = await RNBackgroundDownloader.checkForExistingDownloads();
      console.log('Found existing downloads:', lostTasks.length);
      
      for (let task of lostTasks) {
        console.log(`Re-attaching to task: ${task.id}`);
        const modelId = task.id === 'sarvam-model' ? 'sarvam' : 'whisper';
        
        // Check if we already have this task to prevent duplicate handlers
        if (downloadTasksRef.current.has(modelId)) {
          console.log(`Task ${modelId} already attached, skipping`);
          continue;
        }
        
        // Store the task reference
        downloadTasksRef.current.set(modelId, task);
        
        // Attach progress handlers ONCE
        task.progress(({ bytesDownloaded, bytesTotal }: any) => {
          const progressPercent = Math.floor((bytesDownloaded / bytesTotal) * 100);
          console.log(`${modelId} progress: ${progressPercent}%`);
          setModels(prev =>
            prev.map(m =>
              m.id === modelId ? { ...m, progress: progressPercent, downloading: true } : m
            )
          );
        })
        .done(() => {
          console.log(`${modelId} download completed`);
          setModels(prev =>
            prev.map(m =>
              m.id === modelId ? { ...m, downloading: false, downloaded: true, progress: 100 } : m
            )
          );
          downloadTasksRef.current.delete(modelId);
          Alert.alert(
            'Download Complete',
            `${modelId === 'sarvam' ? 'Sarvam LLM' : 'Whisper STT'} has been downloaded successfully!`,
            [{ text: 'OK' }]
          );
        })
        .error(({ error }: any) => {
          console.error(`${modelId} download error:`, error);
          downloadTasksRef.current.delete(modelId);
          if (!error.includes('cancel') && !error.includes('stop')) {
            setModels(prev =>
              prev.map(m =>
                m.id === modelId ? { ...m, downloading: false, error } : m
              )
            );
          }
        });
      }
      
      await checkExistingModels();
    } catch (error) {
      console.error('Error checking existing downloads:', error);
      await checkExistingModels();
    }
  };

  const checkExistingModels = async () => {
    try {
      // Check Sarvam model
      const sarvamPath = `${RNFS.DocumentDirectoryPath}/sarvam-1.Q8_0.gguf`;
      const sarvamExists = await RNFS.exists(sarvamPath);
      let sarvamComplete = false;
      
      if (sarvamExists) {
        try {
          const stat = await RNFS.stat(sarvamPath);
          // Expected size is ~2.5GB (2621440000 bytes) - adjusted for actual model size
          sarvamComplete = stat.size > 2500000000;
          console.log(`Sarvam file size: ${stat.size} bytes (${(stat.size / 1024 / 1024 / 1024).toFixed(2)} GB), complete: ${sarvamComplete}`);
        } catch (err) {
          console.error('Error checking Sarvam size:', err);
        }
      }
      
      // Check Whisper model
      const whisperPath = `${RNFS.DocumentDirectoryPath}/ggml-large-v3-turbo-q5_0.bin`;
      const whisperExists = await RNFS.exists(whisperPath);
      let whisperComplete = false;
      
      if (whisperExists) {
        try {
          const stat = await RNFS.stat(whisperPath);
          // Expected size is ~547MB (573741824 bytes)
          whisperComplete = stat.size > 500000000;
          console.log(`Whisper file size: ${stat.size} bytes (${(stat.size / 1024 / 1024).toFixed(2)} MB), complete: ${whisperComplete}`);
        } catch (err) {
          console.error('Error checking Whisper size:', err);
        }
      }
      
      setModels(prev => [
        { 
          ...prev[0], 
          downloaded: sarvamComplete, 
          // If file is complete, reset downloading/progress; otherwise keep current state
          downloading: sarvamComplete ? false : prev[0].downloading, 
          progress: sarvamComplete ? 100 : prev[0].progress 
        },
        { 
          ...prev[1], 
          downloaded: whisperComplete,
          // If file is complete, reset downloading/progress; otherwise keep current state
          downloading: whisperComplete ? false : prev[1].downloading, 
          progress: whisperComplete ? 100 : prev[1].progress 
        },
      ]);

      setIsChecking(false);

      // If both models are downloaded, proceed automatically (only in setup mode)
      if (sarvamComplete && whisperComplete && !showDownloaded) {
        setTimeout(() => onComplete(), 1500);
      }
    } catch (error) {
      console.error('Error checking models:', error);
      setIsChecking(false);
    }
  };

  const downloadModel = async (modelId: string) => {
    setModels(prev =>
      prev.map(m =>
        m.id === modelId ? { ...m, downloading: true, paused: false, progress: 0, error: undefined } : m
      )
    );

    if (modelId === 'sarvam') {
      downloadSarvamModel((progress) => {
        setModels(prev =>
          prev.map(m =>
            m.id === modelId ? { ...m, progress } : m
          )
        );
      }, modelId);
    } else if (modelId === 'whisper') {
      downloadWhisperModel((progress) => {
        setModels(prev =>
          prev.map(m =>
            m.id === modelId ? { ...m, progress } : m
          )
        );
      }, modelId);
    }
  };

  const downloadSarvamModel = (onProgress: (progress: number) => void, modelId: string): void => {
    const url = 'https://huggingface.co/QuantFactory/sarvam-1-GGUF/resolve/main/sarvam-1.Q8_0.gguf?download=true';
    const destPath = `${RNFS.DocumentDirectoryPath}/sarvam-1.Q8_0.gguf`;

    const task = RNBackgroundDownloader.download({
      id: 'sarvam-model',
      url: url,
      destination: destPath,
    });

    // Store task immediately
    downloadTasksRef.current.set(modelId, task);
    console.log(`Task created and stored for ${modelId}`);

    task.begin(({ expectedBytes }: any) => {
      console.log(`Sarvam download started, expected: ${expectedBytes} bytes`);
    })
    .progress(({ bytesDownloaded, bytesTotal }: any) => {
      const progressPercent = Math.floor((bytesDownloaded / bytesTotal) * 100);
      console.log(`Sarvam progress: ${progressPercent}%`);
      onProgress(progressPercent);
    })
    .done(() => {
      console.log('Sarvam download completed');
      setModels(prev =>
        prev.map(m =>
          m.id === modelId
            ? { ...m, downloading: false, downloaded: true, progress: 100, paused: false }
            : m
        )
      );
      downloadTasksRef.current.delete(modelId);
      Alert.alert(
        'Download Complete',
        'Sarvam LLM has been downloaded successfully!',
        [{ text: 'OK' }]
      );
    })
    .error(({ error }: any) => {
      console.error('Sarvam download error:', error);
      downloadTasksRef.current.delete(modelId);
      if (!error.includes('cancel') && !error.includes('stop')) {
        setModels(prev =>
          prev.map(m =>
            m.id === modelId
              ? { ...m, downloading: false, paused: false, error }
              : m
          )
        );
      }
    });
  };

  const downloadWhisperModel = (onProgress: (progress: number) => void, modelId: string): void => {
    const url = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin';
    const destPath = `${RNFS.DocumentDirectoryPath}/ggml-large-v3-turbo-q5_0.bin`;

    const task = RNBackgroundDownloader.download({
      id: 'whisper-model',
      url: url,
      destination: destPath,
    });

    // Store task immediately
    downloadTasksRef.current.set(modelId, task);
    console.log(`Task created and stored for ${modelId}`);

    task.begin(({ expectedBytes }: any) => {
      console.log(`Whisper download started, expected: ${expectedBytes} bytes`);
    })
    .progress(({ bytesDownloaded, bytesTotal }: any) => {
      const progressPercent = Math.floor((bytesDownloaded / bytesTotal) * 100);
      console.log(`Whisper progress: ${progressPercent}%`);
      onProgress(progressPercent);
    })
    .done(() => {
      console.log('Whisper download completed');
      setModels(prev =>
        prev.map(m =>
          m.id === modelId
            ? { ...m, downloading: false, downloaded: true, progress: 100, paused: false }
            : m
        )
      );
      downloadTasksRef.current.delete(modelId);
      Alert.alert(
        'Download Complete',
        'Whisper STT has been downloaded successfully!',
        [{ text: 'OK' }]
      );
    })
    .error(({ error }: any) => {
      console.error('Whisper download error:', error);
      downloadTasksRef.current.delete(modelId);
      if (!error.includes('cancel') && !error.includes('stop')) {
        setModels(prev =>
          prev.map(m =>
            m.id === modelId
              ? { ...m, downloading: false, paused: false, error }
              : m
          )
        );
      }
    });
  };

  const cancelDownload = async (modelId: string) => {
    Alert.alert(
      'Cancel Download',
      'Are you sure you want to cancel this download? All progress will be lost.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            console.log(`Cancelling download for ${modelId}`);
            
            // Delete file FIRST - this will force the download to stop
            const filePath = modelId === 'sarvam'
              ? `${RNFS.DocumentDirectoryPath}/sarvam-1.Q8_0.gguf`
              : `${RNFS.DocumentDirectoryPath}/ggml-large-v3-turbo-q5_0.bin`;
            
            try {
              const exists = await RNFS.exists(filePath);
              console.log(`File exists: ${exists}`);
              if (exists) {
                await RNFS.unlink(filePath);
                console.log(`Deleted file: ${filePath}`);
              }
            } catch (err) {
              console.error('Error deleting file:', err);
            }
            
            // Then stop the task
            const task = downloadTasksRef.current.get(modelId);
            if (task) {
              try {
                task.stop();
                console.log(`Task stopped for ${modelId}`);
              } catch (err) {
                console.error('Error stopping task:', err);
              }
              downloadTasksRef.current.delete(modelId);
            }
            
            // Update UI
            setModels(prev =>
              prev.map(m =>
                m.id === modelId
                  ? { ...m, downloading: false, paused: false, progress: 0, error: undefined }
                  : m
              )
            );
            
            console.log('Download cancelled successfully');
          },
        },
      ]
    );
  };

  const pauseDownload = (modelId: string) => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Pause/Resume is only available on iOS. You can cancel the download instead.');
      return;
    }
    
    const task = downloadTasksRef.current.get(modelId);
    if (task) {
      task.pause();
      setModels(prev =>
        prev.map(m =>
          m.id === modelId ? { ...m, paused: true, downloading: false } : m
        )
      );
    }
  };

  const resumeDownload = (modelId: string) => {
    const task = downloadTasksRef.current.get(modelId);
    if (task) {
      task.resume();
      setModels(prev =>
        prev.map(m =>
          m.id === modelId ? { ...m, paused: false, downloading: true } : m
        )
      );
    }
  };

  const deleteModel = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete ${model.name}? This will free up ${model.size} of storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const filePath = modelId === 'sarvam'
                ? `${RNFS.DocumentDirectoryPath}/sarvam-1.Q8_0.gguf`
                : `${RNFS.DocumentDirectoryPath}/ggml-large-v3-turbo-q5_0.bin`;

              if (await RNFS.exists(filePath)) {
                await RNFS.unlink(filePath);
                setModels(prev =>
                  prev.map(m =>
                    m.id === modelId
                      ? { ...m, downloaded: false, progress: 0, error: undefined }
                      : m
                  )
                );
                Alert.alert('Success', `${model.name} has been deleted.`);
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete the model file.');
            }
          },
        },
      ]
    );
  };

  const allModelsDownloaded = models.every(m => m.downloaded);
  const anyDownloading = models.some(m => m.downloading);

  if (isChecking) {
    return (
      <View style={styles.container}>
        <View style={styles.checkingContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.checkingText}>Checking installed models...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        {showDownloaded && (
          <TouchableOpacity onPress={onComplete} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>🇮🇳</Text>
        </View>
        <Text style={styles.title}>{showDownloaded ? 'Model Management' : 'Welcome to Sahay'}</Text>
        <Text style={styles.subtitle}>Your AI companion for Indian languages</Text>
        <Text style={styles.description}>First, let's download the required AI models</Text>
      </View>

      {/* Model Cards */}
      <View style={styles.modelsContainer}>
        {models.map((model) => (
          <View key={model.id} style={styles.modelCard}>
            <View style={styles.modelHeader}>
              <View style={styles.modelInfo}>
                <View style={styles.modelTitleRow}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <View style={styles.sizeTag}>
                    <Text style={styles.sizeText}>{model.size}</Text>
                  </View>
                </View>
                <Text style={styles.modelDescription}>{model.description}</Text>
              </View>

              {/* Status Icon */}
              <View style={styles.statusIcon}>
                {model.downloaded ? (
                  <Text style={styles.checkIcon}>✓</Text>
                ) : model.downloading ? (
                  <ActivityIndicator size="small" color="#0EA5E9" />
                ) : model.error ? (
                  <Text style={styles.errorIcon}>!</Text>
                ) : (
                  <Text style={styles.downloadIcon}>↓</Text>
                )}
              </View>
            </View>

            {/* Progress Bar */}
            {(model.downloading || model.paused) && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText}>
                    {model.paused ? '⏸️ Paused' : 'Downloading...'}
                  </Text>
                  <Text style={styles.progressPercent}>{model.progress}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${model.progress}%` },
                    ]}
                  />
                </View>
                
                {/* Control Buttons */}
                <View style={styles.controlButtonsContainer}>
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      onPress={() => model.paused ? resumeDownload(model.id) : pauseDownload(model.id)}
                      style={styles.controlButton}
                    >
                      <Text style={styles.controlButtonText}>
                        {model.paused ? '▶️ Resume' : '⏸️ Pause'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => cancelDownload(model.id)}
                    style={[styles.controlButton, styles.cancelButton]}
                  >
                    <Text style={styles.cancelButtonText}>❌ Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Error Message */}
            {model.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{model.error}</Text>
              </View>
            )}

            {/* Download Button */}
            {!model.downloaded && !model.downloading && !model.paused && (
              <TouchableOpacity
                onPress={() => downloadModel(model.id)}
                disabled={anyDownloading}
                style={[
                  styles.downloadButton,
                  anyDownloading && styles.downloadButtonDisabled,
                ]}
              >
                <Text style={styles.downloadButtonText}>
                  ↓ Download {model.name}
                </Text>
              </TouchableOpacity>
            )}

            {model.downloaded && (
              <View style={styles.downloadedContainer}>
                <Text style={styles.downloadedText}>✓ Downloaded successfully</Text>
                <TouchableOpacity
                  onPress={() => deleteModel(model.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Continue Button */}
      {allModelsDownloaded && (
        <TouchableOpacity onPress={onComplete} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>✓ Continue to App</Text>
        </TouchableOpacity>
      )}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          <Text style={styles.infoTextBold}>Note:</Text> These models enable offline
          functionality. Downloads continue in the background even if you minimize the app.
          Ensure you have sufficient storage space (~3 GB total).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  scrollContent: {
    padding: 24,
  },
  checkingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: { 
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#8B5CF6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  modelsContainer: {
    marginBottom: 24,
  },
  modelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modelInfo: {
    flex: 1,
    marginRight: 12,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  modelName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 12,
  },
  sizeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sizeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  modelDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 24,
    color: '#10B981',
    fontWeight: 'bold',
  },
  errorIcon: {
    fontSize: 24,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  downloadIcon: {
    fontSize: 24,
    color: '#94A3B8',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#475569',
  },
  progressPercent: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E9D5FF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
  },
  downloadButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadButtonDisabled: {
    opacity: 0.5,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  downloadedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  downloadedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  controlButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  controlButton: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  controlButtonText: {
    fontSize: 13,
    color: '#6B21A8',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoBox: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#6B21A8',
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: '700',
  },
});
