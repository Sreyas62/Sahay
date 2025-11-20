import RNFS from 'react-native-fs';

export interface ChatMessage {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

export interface Chat {
  id: string;
  service: 'general' | 'education' | 'health' | 'legal' | 'frontline';
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  language: string;
}

const STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/chats`;

export class ChatHistoryService {
  // Ensure storage directory exists
  private static async ensureDirectoryExists(): Promise<void> {
    const exists = await RNFS.exists(STORAGE_DIR);
    if (!exists) {
      await RNFS.mkdir(STORAGE_DIR);
    }
  }

  // Generate unique chat ID
  private static generateChatId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get file path for service
  private static getFilePath(service: string): string {
    return `${STORAGE_DIR}/${service}_chats.json`;
  }

  // Create a new chat
  static async createChat(
    service: Chat['service'],
    initialMessage: string,
    language: string
  ): Promise<Chat> {
    const chat: Chat = {
      id: this.generateChatId(),
      service,
      title: this.generateTitle(initialMessage),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      language,
    };

    await this.saveChat(chat);
    return chat;
  }

  // Generate chat title from first message
  private static generateTitle(firstMessage: string): string {
    const maxLength = 40;
    if (firstMessage.length <= maxLength) {
      return firstMessage;
    }
    return firstMessage.substring(0, maxLength - 3) + '...';
  }

  // Save or update a chat
  static async saveChat(chat: Chat): Promise<void> {
    try {
      await this.ensureDirectoryExists();
      const filePath = this.getFilePath(chat.service);
      const existingChats = await this.getAllChats(chat.service);
      
      // Update or add the chat
      const chatIndex = existingChats.findIndex(c => c.id === chat.id);
      if (chatIndex >= 0) {
        existingChats[chatIndex] = {
          ...chat,
          updatedAt: new Date(),
        };
      } else {
        existingChats.unshift({
          ...chat,
          updatedAt: new Date(),
        });
      }

      // Keep only last 50 chats per service
      const chatsToSave = existingChats.slice(0, 50);
      
      await RNFS.writeFile(filePath, JSON.stringify(chatsToSave), 'utf8');
      console.log(`Chat saved for ${chat.service}:`, chat.id);
    } catch (error) {
      console.error('Error saving chat:', error);
      throw error;
    }
  }

  // Get all chats for a service
  static async getAllChats(service: Chat['service']): Promise<Chat[]> {
    try {
      await this.ensureDirectoryExists();
      const filePath = this.getFilePath(service);
      
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        return [];
      }

      const data = await RNFS.readFile(filePath, 'utf8');
      const chats = JSON.parse(data);
      
      // Convert date strings back to Date objects
      return chats.map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  }

  // Get a specific chat by ID
  static async getChat(service: Chat['service'], chatId: string): Promise<Chat | null> {
    const chats = await this.getAllChats(service);
    return chats.find(c => c.id === chatId) || null;
  }

  // Delete a chat
  static async deleteChat(service: Chat['service'], chatId: string): Promise<void> {
    try {
      const chats = await this.getAllChats(service);
      const filteredChats = chats.filter(c => c.id !== chatId);
      
      const filePath = this.getFilePath(service);
      await RNFS.writeFile(filePath, JSON.stringify(filteredChats), 'utf8');
      console.log(`Chat deleted for ${service}:`, chatId);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  // Update chat messages
  static async updateChatMessages(
    service: Chat['service'],
    chatId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    const chat = await this.getChat(service, chatId);
    if (chat) {
      chat.messages = messages;
      chat.updatedAt = new Date();
      await this.saveChat(chat);
    }
  }

  // Clear all chats for a service
  static async clearAllChats(service: Chat['service']): Promise<void> {
    try {
      const filePath = this.getFilePath(service);
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }
      console.log(`All chats cleared for ${service}`);
    } catch (error) {
      console.error('Error clearing chats:', error);
      throw error;
    }
  }

  // Search chats by content
  static async searchChats(service: Chat['service'], query: string): Promise<Chat[]> {
    const allChats = await this.getAllChats(service);
    const lowerQuery = query.toLowerCase();
    
    return allChats.filter(chat => 
      chat.title.toLowerCase().includes(lowerQuery) ||
      chat.messages.some(msg => msg.content.toLowerCase().includes(lowerQuery))
    );
  }
}
