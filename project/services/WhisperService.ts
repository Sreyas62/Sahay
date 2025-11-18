import { initWhisper } from 'whisper.rn';
import RNFS from 'react-native-fs';

export type SupportedLanguage = 'hi' | 'ml' | 'kn' | 'en' | 'auto';

export interface TranscriptionOptions {
  language?: SupportedLanguage;
  translate?: boolean;
  maxLen?: number;
  tokenTimestamps?: boolean;
  speedUp?: boolean;
}

export class WhisperService {
  private isInitialized = false;
  private modelPath: string;
  private defaultLanguage: SupportedLanguage;
  private whisperContext: any = null;

  constructor(modelPath: string, defaultLanguage: SupportedLanguage = 'auto') {
    this.modelPath = modelPath;
    this.defaultLanguage = defaultLanguage;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Whisper with model:', this.modelPath);

      // Verify model file exists
      const exists = await RNFS.exists(this.modelPath);
      if (!exists) {
        throw new Error(`Model file not found at: ${this.modelPath}`);
      }

      const stat = await RNFS.stat(this.modelPath);
      console.log(`Model file size: ${(stat.size / (1024 * 1024)).toFixed(2)}MB`);

      // Initialize Whisper
      this.whisperContext = await initWhisper({
        filePath: this.modelPath,
      });

      this.isInitialized = true;
      console.log('Whisper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper:', error);
      throw new Error(`Whisper initialization failed: ${error}`);
    }
  }

  async transcribe(audioPath: string, options: TranscriptionOptions = {}): Promise<string> {
    if (!this.isInitialized || !this.whisperContext) {
      throw new Error('Whisper not initialized. Call initialize() first.');
    }

    // Verify audio file exists
    const exists = await RNFS.exists(audioPath);
    if (!exists) {
      throw new Error(`Audio file not found at: ${audioPath}`);
    }

    const language = options.language || this.defaultLanguage;
    const langCode = language === 'auto' ? undefined : language;

    // Language-specific prompts
    const languagePrompts: Record<string, string> = {
      'hi': 'नमस्ते, यह हिंदी में है।',
      'ml': 'നമസ്കാരം, ഇത് മലയാളത്തിലാണ്.',
      'kn': 'ನಮಸ್ಕಾರ, ಇದು ಕನ್ನಡದಲ್ಲಿದೆ.',
      'en': 'Hello, this is in English.',
    };

    try {
      console.log(`Transcribing audio: ${audioPath}`);
      console.log(`Language: ${langCode || 'auto'}`);

      const startTime = Date.now();

      const transcribeOptions: any = {
        language: langCode,
        maxLen: options.maxLen,
        tokenTimestamps: options.tokenTimestamps,
        speedUp: options.speedUp !== false,
        translate: false,
      };

      // Add language prompt
      if (langCode && languagePrompts[langCode]) {
        transcribeOptions.prompt = languagePrompts[langCode];
      }

      const { stop, promise } = this.whisperContext.transcribe(audioPath, transcribeOptions);
      const { result, segments } = await promise;

      const duration = Date.now() - startTime;
      console.log(`Transcription completed in ${duration}ms`);

      // Extract text
      let transcription = '';
      if (typeof result === 'string') {
        transcription = result.trim();
      } else if (segments && Array.isArray(segments)) {
        transcription = segments.map((seg: any) => seg.text || '').join(' ').trim();
      }

      // Remove prompt if present
      if (langCode && languagePrompts[langCode]) {
        transcription = transcription.replace(languagePrompts[langCode], '').trim();
      }

      console.log('Final transcription:', transcription);
      return transcription;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Transcription failed: ${error}`);
    }
  }

  setDefaultLanguage(language: SupportedLanguage): void {
    this.defaultLanguage = language;
    console.log('Default language changed to:', language);
  }

  async release(): Promise<void> {
    if (this.isInitialized && this.whisperContext) {
      try {
        await this.whisperContext.release();
        this.whisperContext = null;
        this.isInitialized = false;
        console.log('Whisper context released');
      } catch (error) {
        console.error('Error releasing Whisper:', error);
      }
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
