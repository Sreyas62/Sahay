import { initLlama, releaseAllLlama } from 'llama.rn';
import RNFS from 'react-native-fs';

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export class LLMService {
  private context: any = null;
  private modelPath: string;
  private isInitialized: boolean = false;

  constructor(modelPath: string) {
    this.modelPath = modelPath;
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

      // Initialize Llama
      this.context = await initLlama({
        model: this.modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 1,
      });

      this.isInitialized = true;
      console.log('LLM initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      throw new Error(`LLM initialization failed: ${error}`);
    }
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
          messages,
          n_predict: 10000,
          stop: stopWords,
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

      console.log('=== LLMService.generateResponse complete ===');
      return fullResponse.trim();
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
