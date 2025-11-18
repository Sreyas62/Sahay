import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ChatMessageProps {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

export function ChatMessage({ type, content, timestamp, isVoice }: ChatMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = () => {
    setIsPlaying(!isPlaying);
    // Simulate audio playback
    setTimeout(() => setIsPlaying(false), 2000);
  };

  const isUser = type === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {/* Voice indicator for user messages */}
        {isVoice && isUser && (
          <View style={styles.voiceIndicator}>
            <Text style={styles.voiceIcon}>🎤</Text>
            <Text style={styles.voiceText}>Voice message</Text>
          </View>
        )}

        <Text style={[styles.content, isUser ? styles.userContent : styles.assistantContent]}>
          {content}
        </Text>

        {/* Audio playback for assistant messages */}
        {!isUser && (
          <TouchableOpacity
            onPress={handlePlayAudio}
            style={styles.audioButton}
            accessible={true}
            accessibilityLabel="Play audio"
          >
            <Text style={styles.audioIcon}>🔊</Text>
            <Text style={styles.audioText}>{isPlaying ? 'Playing...' : 'Listen'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Timestamp */}
      <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
        {timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderTopRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
  },
  userContent: {
    color: '#FFFFFF',
  },
  assistantContent: {
    color: '#334155',
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  voiceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  audioIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  audioText: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  timestampRight: {
    textAlign: 'right',
  },
  timestampLeft: {
    textAlign: 'left',
  },
});
