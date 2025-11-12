declare module 'whisper.rn' {
  export interface WhisperContext {
    id: number;
  }

  export interface WhisperInitOptions {
    filePath: string;
    isBundleAsset?: boolean;
    maxContext?: number;
    maxLen?: number;
    bestOf?: number;
  }

  export interface TranscribeOptions {
    contextId: number;
    filePath: string;
    jobId?: number;
    language?: string;
    maxLen?: number;
    maxContext?: number;
    offset?: number;
    duration?: number;
    translate?: boolean;
    noContext?: boolean;
    singleSegment?: boolean;
    printSpecial?: boolean;
    printProgress?: boolean;
    printRealtime?: boolean;
    printTimestamps?: boolean;
    tokenTimestamps?: boolean;
    splitOnWord?: boolean;
    speedUp?: boolean;
    prompt?: string;
    temperature?: number;
    maxInitialTs?: number;
    lengthPenalty?: number;
    temperatureInc?: number;
    entropyThold?: number;
    logprobThold?: number;
    noSpeechThold?: number;
  }

  export interface TranscribeRealtimeOptions {
    contextId: number;
    jobId: number;
    audioData?: number[];
    language?: string;
    maxLen?: number;
    maxContext?: number;
    translate?: boolean;
    noContext?: boolean;
    singleSegment?: boolean;
    printSpecial?: boolean;
    printProgress?: boolean;
    printRealtime?: boolean;
    printTimestamps?: boolean;
    tokenTimestamps?: boolean;
    splitOnWord?: boolean;
    speedUp?: boolean;
    prompt?: string;
    temperature?: number;
    maxInitialTs?: number;
    lengthPenalty?: number;
    temperatureInc?: number;
    entropyThold?: number;
    logprobThold?: number;
    noSpeechThold?: number;
  }

  export interface TranscribeResult {
    code: number;
    data?: string | {
      result: string;
      segments?: Array<{
        text: string;
        t0: number;
        t1: number;
      }>;
    };
  }

  export function initWhisper(options: WhisperInitOptions): Promise<WhisperContext>;
  export function transcribeFile(options: TranscribeOptions): Promise<TranscribeResult>;
  export function transcribeRealtime(options: TranscribeRealtimeOptions): Promise<TranscribeResult>;
  export function releaseWhisper(contextId: number): Promise<void>;
  export function releaseAllWhisper(): Promise<void>;
}