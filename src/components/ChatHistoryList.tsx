import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Chat } from '../services/ChatHistoryService';

interface ChatHistoryListProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}

export function ChatHistoryList({
  chats,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  onClose,
}: ChatHistoryListProps) {
  const handleDelete = (chatId: string, title: string) => {
    Alert.alert(
      'Delete Chat',
      `Delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteChat(chatId),
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat History</Text>
        <TouchableOpacity onPress={onNewChat} style={styles.newChatButton}>
          <Icon name="plus" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent}>
        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="chat-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No chat history yet</Text>
            <Text style={styles.emptyStateSubtext}>Start a new conversation!</Text>
          </View>
        ) : (
          chats.map((chat) => (
            <View key={chat.id} style={styles.chatItem}>
              <TouchableOpacity
                style={styles.chatItemContent}
                onPress={() => onSelectChat(chat.id)}
              >
                <View style={styles.chatItemHeader}>
                  <Text style={styles.chatItemTitle} numberOfLines={1}>
                    {chat.title}
                  </Text>
                  <Text style={styles.chatItemDate}>{formatDate(chat.updatedAt)}</Text>
                </View>
                <Text style={styles.chatItemPreview} numberOfLines={2}>
                  {chat.messages.length > 0
                    ? chat.messages[chat.messages.length - 1].content
                    : 'New conversation'}
                </Text>
                <View style={styles.chatItemFooter}>
                  <Text style={styles.chatItemMeta}>
                    {chat.messages.length} messages
                  </Text>
                  <View style={styles.languageBadge}>
                    <Text style={styles.languageText}>
                      {chat.language === 'en' ? 'EN' : 
                       chat.language === 'hi' ? 'हि' : 
                       chat.language === 'ml' ? 'മ' : 'ಕ'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(chat.id, chat.title)}
              >
                <Icon name="delete-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  chatItemContent: {
    flex: 1,
    padding: 16,
  },
  chatItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatItemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  chatItemDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chatItemPreview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  chatItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatItemMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  languageBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  languageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteButton: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
});
