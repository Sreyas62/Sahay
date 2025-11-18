import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ModelDownloadScreenProps {
  onComplete: () => void;
  showDownloaded?: boolean;
}

export function ModelDownloadScreen({ onComplete, showDownloaded = false }: ModelDownloadScreenProps) {
  const [ModelSetup, setModelSetup] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically import ModelSetup to catch any initialization errors
    try {
      const ModelSetupModule = require('../../project/components/ModelSetup');
      setModelSetup(() => ModelSetupModule.ModelSetup);
    } catch (error: any) {
      console.error('Failed to load ModelSetup:', error);
      setLoadError(error?.message || 'Native modules not initialized');
    }
  }, []);

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {loadError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Setup Required</Text>
          <Text style={styles.errorText}>
            Native file system module failed to initialize. This usually happens on first launch.
          </Text>
          <Text style={styles.errorHint}>
            Please completely close and restart the app.
          </Text>
          <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
            <Text style={styles.skipButtonText}>Continue Anyway →</Text>
          </TouchableOpacity>
        </View>
      ) : ModelSetup ? (
        <ModelSetup onComplete={onComplete} showDownloaded={showDownloaded} />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    opacity: 0.9,
  },
  errorHint: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ModelDownloadScreen;
