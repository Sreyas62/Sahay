import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Linking,
  NativeModules,
} from 'react-native';
import RNFS from 'react-native-fs';

const { AudioRecorderModule } = NativeModules;

interface AudioRecorderProps {
  onAudioRecorded: (audioPath: string) => void;
  isProcessing: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioRecorded,
  isProcessing,
  disabled = false,
  fullWidth = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [durationInterval, setDurationInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Sahay needs access to your microphone to record voice messages.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Microphone permission granted');
          setHasPermission(true);
          setPermissionDenied(false);
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          console.log('Microphone permission permanently denied');
          setHasPermission(false);
          setPermissionDenied(true);
          showPermissionAlert();
        } else {
          console.log('Microphone permission denied');
          setHasPermission(false);
          setPermissionDenied(true);
        }
      } catch (err) {
        console.warn('Permission error:', err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  };

  const showPermissionAlert = () => {
    Alert.alert(
      'Microphone Permission Required',
      'Sahay needs microphone access. Please enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const startRecording = async () => {
    if (!hasPermission) {
      if (permissionDenied) {
        showPermissionAlert();
      } else {
        await requestPermissions();
      }
      return;
    }

    try {
      const fileName = `recording_${Date.now()}.wav`;
      console.log('Starting recording:', fileName);
      
      const filePath = await AudioRecorderModule.startRecording(fileName);
      console.log('Recording started, path:', filePath);
      
      setIsRecording(true);

      const interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      setDurationInterval(interval);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      console.log('Stopping recording...');
      
      if (durationInterval) {
        clearInterval(durationInterval);
        setDurationInterval(null);
      }

      const duration = recordingDuration;
      setRecordingDuration(0);
      setIsRecording(false);

      if (duration < 1) {
        Alert.alert('Recording Too Short', 'Please record for at least 1 second.');
        await AudioRecorderModule.stopRecording();
        return;
      }

      const filePath = await AudioRecorderModule.stopRecording();
      console.log('Recording stopped:', filePath);

      // Verify file exists
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        Alert.alert('Error', 'Recording file not found.');
        return;
      }

      const stat = await RNFS.stat(filePath);
      console.log(`WAV file size: ${(stat.size / 1024).toFixed(2)}KB`);
      
      if (stat.size < 1000) {
        Alert.alert('Error', 'Recording file is too small.');
        await RNFS.unlink(filePath);
        return;
      }

      // WAV file is ready for Whisper
      onAudioRecorded(filePath);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const handlePress = async () => {
    if (!hasPermission && permissionDenied) {
      showPermissionAlert();
      return;
    }

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const isDisabled = disabled || isProcessing;

  if (fullWidth) {
    // Large "Tap to speak" button for voice mode
    return (
      <View style={styles.fullWidthContainer}>
        <TouchableOpacity
          style={[
            styles.tapToSpeakButton,
            isRecording && styles.tapToSpeakRecording,
            (isDisabled || !hasPermission) && styles.tapToSpeakDisabled,
          ]}
          onPress={handlePress}
          disabled={isDisabled}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="large" style={{ marginBottom: 8 }} />
              <Text style={styles.tapToSpeakText}>Processing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.tapToSpeakText}>
                {isRecording ? `Recording ${recordingDuration}s` : 'Tap to speak'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {!hasPermission && (
          <TouchableOpacity 
            style={styles.permissionButtonLarge}
            onPress={permissionDenied ? showPermissionAlert : requestPermissions}
          >
            <Text style={styles.permissionTextLarge}>
              {permissionDenied ? '⚠️ Enable Microphone in Settings' : '🎤 Grant Microphone Permission'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Small button for inline mode
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording && styles.recordingButton,
          (isDisabled || !hasPermission) && styles.disabledButton,
        ]}
        onPress={handlePress}
        disabled={isDisabled}
      >
        {isProcessing ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.recordButtonText}>
            {isRecording ? '⏹️' : '🎤'}
          </Text>
        )}
      </TouchableOpacity>
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.durationText}>{recordingDuration}s</Text>
        </View>
      )}
      {!hasPermission && (
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={permissionDenied ? showPermissionAlert : requestPermissions}
        >
          <Text style={styles.permissionText}>
            {permissionDenied ? '⚠️ Enable in Settings' : '🎤 Grant Permission'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  fullWidthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0.1,
  },
  recordButtonText: {
    fontSize: 22,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  durationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  tapToSpeakButton: {
    width: '100%',
    paddingVertical: 10,
    backgroundColor: '#6366F1',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tapToSpeakRecording: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  tapToSpeakDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0.1,
  },
  tapToSpeakIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  tapToSpeakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionButton: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  permissionText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionButtonLarge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  permissionTextLarge: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
});