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

      // Initialize Whisper (optimized for low-end device compatibility)
      this.whisperContext = await initWhisper({
        filePath: this.modelPath,
      });

      this.isInitialized = true;
      console.log('Whisper initialized successfully with optimized config');
    } catch (error) {
      console.error('Failed to initialize Whisper:', error);
      throw new Error(`Whisper initialization failed: ${error}`);
    }
  }

  private async validateAudioFile(audioPath: string): Promise<boolean> {
    try {
      const stat = await RNFS.stat(audioPath);
      const fileSizeKB = stat.size / 1024;
      
      // Audio should be at least 5KB (very short) and less than 50MB
      if (fileSizeKB < 5) {
        console.warn('Audio file too small:', fileSizeKB, 'KB');
        return false;
      }
      
      if (fileSizeKB > 50 * 1024) {
        console.warn('Audio file too large:', fileSizeKB, 'KB');
        return false;
      }
      
      console.log(`Audio file validated: ${fileSizeKB.toFixed(2)}KB`);
      return true;
    } catch (error) {
      console.error('Audio validation error:', error);
      return false;
    }
  }

  private cleanTranscription(text: string, languagePrompt?: string): string {
    let cleaned = text.trim();
    
    // Remove language prompt if present
    if (languagePrompt) {
      cleaned = cleaned.replace(languagePrompt, '').trim();
    }
    
    // Remove common hallucinations and artifacts (only obvious ones)
    const artifacts = [
      '[BLANK_AUDIO]',
      '[MUSIC]',
      '[NOISE]',
      '(inaudible)',
      'Thank you for watching',
      'Thanks for watching',
      'Please subscribe',
    ];
    
    artifacts.forEach(artifact => {
      cleaned = cleaned.replace(new RegExp(artifact, 'gi'), '');
    });
    
    // Remove excessive repetition (same word repeated 4+ times, not 3)
    cleaned = cleaned.replace(/(\b\w+\b)(\s+\1){3,}/gi, '$1');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
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

    // Validate audio file quality
    const isValid = await this.validateAudioFile(audioPath);
    if (!isValid) {
      throw new Error('Audio file validation failed. Please record again.');
    }

    const language = options.language || this.defaultLanguage;
    const langCode = language === 'auto' ? undefined : language;

    // Enhanced language-specific prompts
    const languagePrompts: Record<string, string> = {
      'hi': 'नमस्ते, यह हिंदी में बोला गया है।',
      'ml': 'നമസ്കാരം, ഇത് മലയാളത്തിൽ പറഞ്ഞതാണ്.',
      'kn': 'ನಮಸ್ಕಾರ, ಇದು ಕನ್ನಡದಲ್ಲಿ ಹೇಳಲಾಗಿದೆ.',
      'en': 'Hello, this is spoken in English.',
    };

    try {
      console.log(`Transcribing audio: ${audioPath}`);
      console.log(`Language: ${langCode || 'auto'}`);

      const startTime = Date.now();

      // Optimized transcription options for MAXIMUM SPEED
      const transcribeOptions: any = {
        language: langCode,
        translate: false,
        
        // Speed settings optimized for low-end devices
        maxLen: 0,                          // Auto-detect
        tokenTimestamps: false,             // Disable for speed
        speedUp: true,                      // Enable speed optimization
        
        // Faster beam search
        beamSize: 3,                        // Smaller = faster (was 5)
        bestOf: 3,                          // Fewer candidates = faster (was 5)
        
        // Temperature and thresholds for quality control
        temperature: 0.0,                   // Deterministic output
        temperatureInc: 0.2,                // Fallback temperature increase
        
        // Quality thresholds
        compressionRatioThreshold: 2.4,     // Detect gibberish
        logProbThreshold: -1.0,             // Probability threshold
        noSpeechThreshold: 0.6,             // Silence detection
        
        // Context settings
        maxContext: -1,                     // Use full context
        maxSegmentLength: 0,                // No limit
        
        // Word-level timestamps disabled for speed
        wordTimestamps: false,
      };

      // Add language prompt for better accuracy
      if (langCode && languagePrompts[langCode]) {
        transcribeOptions.prompt = languagePrompts[langCode];
      }

      const { stop, promise } = this.whisperContext.transcribe(audioPath, transcribeOptions);
      const { result, segments } = await promise;

      const duration = Date.now() - startTime;
      console.log(`Transcription completed in ${duration}ms`);

      // Extract text with quality checks
      let transcription = '';
      if (typeof result === 'string') {
        transcription = result.trim();
      } else if (segments && Array.isArray(segments)) {
        transcription = segments.map((seg: any) => seg.text || '').join(' ').trim();
      }

      // Clean and validate transcription
      const prompt = langCode && languagePrompts[langCode] ? languagePrompts[langCode] : undefined;
      const cleanedTranscription = this.cleanTranscription(transcription, prompt);

      // Check if transcription is meaningful (very lenient - just check it's not empty)
      if (!cleanedTranscription || cleanedTranscription.length === 0) {
        console.warn('Transcription empty after cleaning, using original:', transcription);
        // Use original transcription if cleaning removed everything
        transcription = transcription.trim();
      } else {
        transcription = cleanedTranscription;
      }

      // Final check - only reject if completely empty
      if (!transcription || transcription.length === 0) {
        console.warn('Transcription completely empty');
        throw new Error('No clear speech detected. Please speak clearly and try again.');
      }

      console.log('Final transcription:', transcription);
      console.log('Transcription quality: chars=', transcription.length, 'time=', duration, 'ms');
      
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
