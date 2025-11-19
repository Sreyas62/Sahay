import { initLlama, releaseAllLlama } from 'llama.rn';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

interface DeviceConfig {
  n_ctx: number;
  n_batch: number;
  n_threads: number;
  n_gpu_layers: number;
}

export class LLMService {
  private context: any = null;
  private modelPath: string;
  private isInitialized: boolean = false;
  private deviceConfig: DeviceConfig;
  private conversationTokenCount: number = 0;
  private readonly MAX_CONTEXT_TOKENS = 1536; // Leave room for response

  constructor(modelPath: string) {
    this.modelPath = modelPath;
    this.deviceConfig = this.detectDeviceConfig();
  }

  private detectDeviceConfig(): DeviceConfig {
    // Optimized for SPEED on low to mid-range Android devices
    return {
      n_ctx: 2048,           // Context window - balanced for memory
      n_batch: 512,          // Larger batch = faster prompt processing
      n_threads: 6,          // More threads for parallel processing (most phones have 6-8 cores)
      n_gpu_layers: 0,       // CPU-only for reliability on diverse hardware
    };
  }

  async initialize(): Promise<void> {
    try {
      // Verify model file exists
      const exists = await RNFS.exists(this.modelPath);
      if (!exists) {
        throw new Error(`Model file not found at: ${this.modelPath}`);
      }

      const stat = await RNFS.stat(this.modelPath);
      console.log(`Model file size: ${(stat.size / (1024 * 1024 * 1024)).toFixed(2)}GB`);

      console.log('Device config:', this.deviceConfig);

      // Initialize Llama with optimized settings
      this.context = await initLlama({
        model: this.modelPath,
        use_mlock: true,                    // Lock memory to prevent swapping
        n_ctx: this.deviceConfig.n_ctx,
        n_batch: this.deviceConfig.n_batch,
        n_threads: this.deviceConfig.n_threads,
        n_gpu_layers: this.deviceConfig.n_gpu_layers,
        // Additional optimizations
        embedding: false,                    // We don't need embeddings
        rope_freq_base: 10000,              // Better context handling
        rope_freq_scale: 1.0,
      });

      this.isInitialized = true;
      console.log('LLM initialized successfully with optimized config');
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      throw new Error(`LLM initialization failed: ${error}`);
    }
  }

  private pruneMessages(messages: Message[]): Message[] {
    // Keep system message and manage context window
    if (messages.length <= 3) return messages; // System + 1 exchange

    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Estimate tokens (rough: 4 chars per token)
    let estimatedTokens = 0;
    const prunedConversation: Message[] = [];

    // Keep recent messages that fit in context
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msg = conversationMessages[i];
      const msgTokens = Math.ceil(msg.content.length / 4);
      
      if (estimatedTokens + msgTokens < this.MAX_CONTEXT_TOKENS) {
        prunedConversation.unshift(msg);
        estimatedTokens += msgTokens;
      } else {
        break;
      }
    }

    console.log(`Context pruning: ${conversationMessages.length} -> ${prunedConversation.length} messages, ~${estimatedTokens} tokens`);
    return [...systemMessages, ...prunedConversation];
  }

  async generateResponse(
    messages: Message[],
    onToken?: (token: string) => void,
    onComplete?: (tokensPerSecond: number) => void
  ): Promise<string> {
    console.log('=== LLMService.generateResponse called ===');
    console.log('Is initialized:', this.isInitialized);
    console.log('Has context:', !!this.context);
    console.log('Messages count:', messages.length);
    
    if (!this.isInitialized || !this.context) {
      const error = 'LLM not initialized. Call initialize() first.';
      console.error(error);
      throw new Error(error);
    }

    // Prune messages to fit context window
    const prunedMessages = this.pruneMessages(messages);

    const stopWords = [
      '</s>',
      '<|end|>',
      'user:',
      'assistant:',
      '<|im_end|>',
      '<|eot_id|>',
      '<|end▁of▁sentence|>',
      '<|end_of_text|>',
      '<｜end▁of▁sentence｜>',
    ];

    let fullResponse = '';
    let tokenCount = 0;

    try {
      console.log('Starting context.completion...');
      const result = await this.context.completion(
        {
          messages: prunedMessages,
          // Optimized for MAXIMUM SPEED
          n_predict: 256,              // Shorter responses = faster (was 512)
          stop: stopWords,
          
          // Faster sampling parameters
          temperature: 0.6,            // Lower = more deterministic = faster
          top_p: 0.85,                 // Slightly lower for speed
          top_k: 30,                   // Smaller vocabulary = faster sampling
          repeat_penalty: 1.1,         // Lighter penalty = faster
          repeat_last_n: 32,           // Shorter lookback = faster (was 64)
          
          // Minimal quality controls for speed
          min_p: 0.1,                  // Higher threshold = faster (was 0.05)
          tfs_z: 1.0,                  // Keep tail free sampling
          typical_p: 1.0,              // Keep typical sampling
          penalty_last_n: 32,          // Shorter window = faster (was 64)
          
          // Performance
          n_threads: this.deviceConfig.n_threads,
        },
        (data: any) => {
          const token = data.token;
          fullResponse += token;
          tokenCount++;
          
          if (tokenCount % 10 === 0) {
            console.log(`Tokens received: ${tokenCount}, last token:`, token);
          }
          
          if (onToken) {
            onToken(token);
          }
        }
      );

      console.log('Completion finished. Total tokens:', tokenCount);
      console.log('Result timings:', result.timings);

      if (onComplete && result.timings) {
        onComplete(parseFloat(result.timings.predicted_per_second.toFixed(2)));
      }

      // Post-process response
      let cleanedResponse = fullResponse.trim();
      
      // Remove any remaining stop words
      stopWords.forEach(stop => {
        cleanedResponse = cleanedResponse.replace(stop, '');
      });
      
      // Remove incomplete sentence at the end if cut off
      if (tokenCount >= 256 && !cleanedResponse.match(/[.!?।॥]$/)) {
        const lastSentence = cleanedResponse.lastIndexOf('.');
        const lastQuestion = cleanedResponse.lastIndexOf('?');
        const lastExclaim = cleanedResponse.lastIndexOf('!');
        const lastDevanagari = Math.max(
          cleanedResponse.lastIndexOf('।'),
          cleanedResponse.lastIndexOf('॥')
        );
        
        const lastPunctuation = Math.max(lastSentence, lastQuestion, lastExclaim, lastDevanagari);
        if (lastPunctuation > cleanedResponse.length * 0.7) {
          cleanedResponse = cleanedResponse.substring(0, lastPunctuation + 1);
        }
      }

      console.log('=== LLMService.generateResponse complete ===');
      return cleanedResponse.trim();
    } catch (error) {
      console.error('Error in LLMService.generateResponse:', error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  async stopGeneration(): Promise<void> {
    if (this.context) {
      try {
        await this.context.stopCompletion();
      } catch (error) {
        console.error('Error stopping generation:', error);
      }
    }
  }

  async release(): Promise<void> {
    if (this.isInitialized && this.context) {
      try {
        await releaseAllLlama();
        this.context = null;
        this.isInitialized = false;
        console.log('LLM context released');
      } catch (error) {
        console.error('Error releasing LLM:', error);
      }
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
