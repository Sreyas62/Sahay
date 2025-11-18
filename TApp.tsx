import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

import Markdown from "react-native-markdown-display";
// export { AudioRecorder } from './src/components/AudioRecorder';

import { initLlama, releaseAllLlama } from "llama.rn"; // Import llama.rn
import { downloadModel } from "./src/api/model"; // Download function
import ProgressBar from "./src/components/ProgressBar"; // Progress bar component
import RNFS from "react-native-fs"; // File system module
import axios from "axios";
import { initWhisper } from "whisper.rn"; // ✅ Only import initWhisper
import { AudioRecorder } from "./src/components/AudioRecorder";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  thought?: string; // Single thought block
  showThought?: boolean;
};

export type SupportedLanguage = "hi" | "ml" | "kn" | "en" | "auto";

export interface TranscriptionOptions {
  language?: SupportedLanguage;
  translate?: boolean;
  maxLen?: number;
  tokenTimestamps?: boolean;
  speedUp?: boolean;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export class SpeechToTextService {
  private isInitialized = false;
  private modelPath: string;
  private defaultLanguage: SupportedLanguage;
  private whisperContext: any = null; // Store the context object

  constructor(
    modelPath: string,
    defaultLanguage: SupportedLanguage = "auto"
  ) {
    this.modelPath = modelPath;
    this.defaultLanguage = defaultLanguage;
  }

  async initialize(): Promise<void> {
    try {
      console.log("Initializing Whisper with model:", this.modelPath);

      // Verify model file exists
      const exists = await RNFS.exists(this.modelPath);
      if (!exists) {
        throw new Error(`Model file not found at: ${this.modelPath}`);
      }

      const stat = await RNFS.stat(this.modelPath);
      console.log(`Model file size: ${(stat.size / (1024 * 1024)).toFixed(2)}MB`);

      // Initialize Whisper - returns a context object
      this.whisperContext = await initWhisper({
        filePath: this.modelPath,
      });

      this.isInitialized = true;
      console.log("Whisper initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Whisper:", error);
      throw new Error(`Whisper initialization failed: ${error}`);
    }
  }

  async transcribe(
    audioPath: string,
    options: TranscriptionOptions = {}
  ): Promise<string> {
    if (!this.isInitialized || !this.whisperContext) {
      throw new Error("Whisper not initialized. Call initialize() first.");
    }

    // Verify audio file exists
    const exists = await RNFS.exists(audioPath);
    if (!exists) {
      throw new Error(`Audio file not found at: ${audioPath}`);
    }

    const language = options.language || this.defaultLanguage;
    const langCode = language === "auto" ? undefined : language;

    // Language-specific prompts to help Whisper identify the language
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

      // Add language-specific prompt to help Whisper
      const transcribeOptions: any = {
        language: langCode,
        maxLen: options.maxLen,
        tokenTimestamps: options.tokenTimestamps,
        speedUp: options.speedUp !== false,
        translate: false, // Never translate, we want original language
      };

      // Add prompt for Indic languages to help with script detection
      if (langCode && languagePrompts[langCode]) {
        transcribeOptions.prompt = languagePrompts[langCode];
      }

      const { stop, promise } = this.whisperContext.transcribe(audioPath, transcribeOptions);

      // Wait for transcription to complete
      const { result, segments } = await promise;

      const duration = Date.now() - startTime;
      console.log(`Transcription completed in ${duration}ms`);

      // Extract text from result
      let transcription = "";

      if (typeof result === "string") {
        transcription = result.trim();
      } else if (segments && Array.isArray(segments)) {
        transcription = segments
          .map((seg: any) => seg.text || "")
          .join(" ")
          .trim();
      }

      // Remove the prompt if it appears in the transcription
      if (langCode && languagePrompts[langCode]) {
        transcription = transcription.replace(languagePrompts[langCode], '').trim();
      }

      if (!transcription) {
        console.warn("Transcription returned empty result");
      }

      console.log("Final transcription:", transcription);
      console.log("Detected language:", langCode);
      
      return transcription;
    } catch (error) {
      console.error("Transcription error:", error);
      throw new Error(`Transcription failed: ${error}`);
    }
  }

  setDefaultLanguage(language: SupportedLanguage): void {
    this.defaultLanguage = language;
    console.log("Default language changed to:", language);
  }

  async release(): Promise<void> {
    if (this.isInitialized && this.whisperContext) {
      try {
        // Correct API: Call release() on the context object
        await this.whisperContext.release();
        this.whisperContext = null;
        this.isInitialized = false;
        console.log("Whisper context released");
      } catch (error) {
        console.error("Error releasing Whisper:", error);
      }
    }
  }
}

export interface WhisperModelInfo {
  name: string;
  size: string;
  url: string;
  languages: string[];
  description: string;
}

// Using ggml format models (required for whisper.cpp/whisper.rn)
export const WHISPER_MODELS: Record<string, WhisperModelInfo> = {
  // 🚀 Fastest - Good for quick testing
  tiny: {
    name: "ggml-tiny",
    size: "75MB",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    languages: ["hi", "ml", "kn", "en", "ta", "te", "bn", "gu", "mr", "pa"],
    description: "⚡ Fastest - Basic accuracy",
  },
  
  // 💡 Current default
  base: {
    name: "ggml-base",
    size: "142MB",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    languages: ["hi", "ml", "kn", "en", "ta", "te", "bn", "gu", "mr", "pa"],
    description: "💡 Balanced - Good for mobile",
  },
  
  // 🎯 Better accuracy
  small: {
    name: "ggml-small",
    size: "466MB",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    languages: ["hi", "ml", "kn", "en", "ta", "te", "bn", "gu", "mr", "pa"],
    description: "🎯 Better accuracy",
  },

  // ⚡ NEW: Latest OpenAI Model - RECOMMENDED
  large_v3_turbo_q5: {
    name: "ggml-large-v3-turbo-q5_0",
    size: "547MB",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin",
    languages: ["hi", "ml", "kn", "en", "ta", "te", "bn", "gu", "mr", "pa"],
    description: "⚡ Latest v3 Turbo - Best Indian languages (RECOMMENDED)",
  },

  // 🇮🇳 NEW: AI4Bharat Fine-tuned for Indian Languages
  indic_medium: {
    name: "ggml-medium-indic",
    size: "785MB",
    url: "https://huggingface.co/danielus/ggml-whisper-models/resolve/main/ggml-medium-indic.bin",
    languages: ["hi", "ml", "kn", "ta", "te", "bn", "mr"],
    description: "🇮🇳 AI4Bharat - Optimized for Indian accents",
  },
};

// Update the type to include new models
type WhisperModelKey = 'tiny' | 'base' | 'small' | 'large_v3_turbo_q5' | 'indic_medium';

export const downloadWhisperModel = async (
  modelKey: keyof typeof WHISPER_MODELS,
  onProgress: (progress: number) => void
): Promise<string> => {
  const model = WHISPER_MODELS[modelKey];
  const fileName = `${model.name}.bin`;
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  // Check if already exists
  const exists = await RNFS.exists(destPath);
  if (exists) {
    console.log("Whisper model already exists:", destPath);

    // Verify file size is reasonable
    const stat = await RNFS.stat(destPath);
    const fileSizeMB = stat.size / (1024 * 1024);
    console.log(`Existing model size: ${fileSizeMB.toFixed(2)}MB`);

    if (fileSizeMB < 10) {
      console.log("File seems corrupted, re-downloading...");
      await RNFS.unlink(destPath);
    } else {
      return destPath;
    }
  }

  console.log(`Downloading ${model.name} (${model.size}) from ${model.url}...`);

  try {
    const downloadResult = RNFS.downloadFile({
      fromUrl: model.url,
      toFile: destPath,
      progressDivider: 10, // Report progress every 10%
      begin: (res) => {
        console.log("Download started:", {
          contentLength: res.contentLength,
          statusCode: res.statusCode,
        });
      },
      progress: (res) => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        onProgress(Math.floor(progress));

        if (progress % 20 === 0) {
          console.log(`Download progress: ${progress.toFixed(1)}%`);
        }
      },
    });

    const result = await downloadResult.promise;

    if (result.statusCode === 200) {
      // Verify downloaded file
      const stat = await RNFS.stat(destPath);
      const fileSizeMB = stat.size / (1024 * 1024);
      console.log(`Downloaded successfully: ${fileSizeMB.toFixed(2)}MB`);

      return destPath;
    } else {
      throw new Error(`Download failed with status ${result.statusCode}`);
    }
  } catch (error) {
    console.error("Whisper model download error:", error);

    // Clean up partial download
    if (await RNFS.exists(destPath)) {
      await RNFS.unlink(destPath);
    }

    throw error;
  }
};

export const checkWhisperModelExists = async (
  modelKey: keyof typeof WHISPER_MODELS
): Promise<boolean> => {
  const model = WHISPER_MODELS[modelKey];
  const fileName = `${model.name}.bin`;
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
  return await RNFS.exists(destPath);
};

export const deleteWhisperModel = async (
  modelKey: keyof typeof WHISPER_MODELS
): Promise<void> => {
  const model = WHISPER_MODELS[modelKey];
  const fileName = `${model.name}.bin`;
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  const exists = await RNFS.exists(destPath);
  if (exists) {
    await RNFS.unlink(destPath);
    console.log("Whisper model deleted:", destPath);
  }
};

export const getWhisperModelPath = (modelKey: keyof typeof WHISPER_MODELS): string => {
  const model = WHISPER_MODELS[modelKey];
  const fileName = `${model.name}.bin`;
  return `${RNFS.DocumentDirectoryPath}/${fileName}`;
};

function App(): React.JSX.Element {
  const INITIAL_CONVERSATION: Message[] = [
    {
      role: "system",
      content:
        "This is a conversation between user and assistant, a friendly chatbot.",
    },
  ];
  const [context, setContext] = useState<any>(null);
  const [conversation, setConversation] =
    useState<Message[]>(INITIAL_CONVERSATION);
  const [userInput, setUserInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [selectedModelFormat, setSelectedModelFormat] = useState<string>("");
  const [selectedGGUF, setSelectedGGUF] = useState<string | null>(null);
  const [availableGGUFs, setAvailableGGUFs] = useState<string[]>([]); // List of .gguf files
  const [currentPage, setCurrentPage] = useState<
    "modelSelection" | "conversation"
  >("modelSelection"); // Navigation state
  const [tokensPerSecond, setTokensPerSecond] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);

  // Add STT states
  const [sttService, setSttService] = useState<SpeechToTextService | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [whisperModelLoaded, setWhisperModelLoaded] = useState(false);
  const [whisperDownloadProgress, setWhisperDownloadProgress] = useState(0);
  const [isDownloadingWhisper, setIsDownloadingWhisper] = useState(false);
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState<SupportedLanguage>('hi');
  const [whisperModelKey, setWhisperModelKey] = useState<WhisperModelKey>('small');

  const modelFormats = [
    // { label: "Llama-3.2-1B-Instruct" },
    // { label: "Qwen2-0.5B-Instruct" },
    // { label: "DeepSeek-R1-Distill-Qwen-1.5B" },
    // { label: "SmolLM2-1.7B-Instruct" },
    // { label: "Gemma3-1B-IT" },
    // { label: "Tensorblock" },
    // { label: "Bharath4ai" },
    // { label: "BharathGPT" },
    // { label: "QuantFactoryBharat" },
    { label: "Sarvam" },
    // { label: "Sarvam2" },
  ];

  const HF_TO_GGUF = {
    // 'Llama-3.2-1B-Instruct': 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    // "Llama-3.2-1B-Instruct": "medmekk/Llama-3.2-1B-Instruct.GGUF",
    // "DeepSeek-R1-Distill-Qwen-1.5B":
    //   "medmekk/DeepSeek-R1-Distill-Qwen-1.5B.GGUF",
    // "Qwen2-0.5B-Instruct": "medmekk/Qwen2.5-0.5B-Instruct.GGUF",
    // "SmolLM2-1.7B-Instruct": "medmekk/SmolLM2-1.7B-Instruct.GGUF",
    // "Gemma3-1B-IT": "featherless-ai-quants/Telugu-LLM-Labs-Indic-gemma-2b-finetuned-sft-Navarasa-2.0-GGUF",
    // "Tensorblock": "tensorblock/snorbyte_snorTTS-Indic-v0-GGUF",
    // "Bharath4ai": "bh4/IndicTrans3-beta-Q2_K-GGUF",
    // "BharathGPT": "mradermacher/BharatGPT-3B-Indic-i1-GGUF",
    // "QuantFactoryBharat": "QuantFactory/BharatGPT-3B-Indic-GGUF",
    "Sarvam": "QuantFactory/sarvam-1-GGUF",
    // "Sarvam2":"mayupat13/sarvam-model-gguf"
  };

  // To handle the scroll view
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);

  const handleGGUFSelection = (file: string) => {
    setSelectedGGUF(file);
    Alert.alert(
      "Confirm Download",
      `Do you want to download ${file} ?`,
      [
        {
          text: "No",
          onPress: () => setSelectedGGUF(null),
          style: "cancel",
        },
        { text: "Yes", onPress: () => handleDownloadAndNavigate(file) },
      ],
      { cancelable: false }
    );
  };

  const handleDownloadAndNavigate = async (file: string) => {
    await handleDownloadModel(file);
    setCurrentPage("conversation"); // Navigate to conversation after download
  };

  const handleBackToModelSelection = () => {
    setContext(null);
    releaseAllLlama();
    setConversation(INITIAL_CONVERSATION);
    setSelectedGGUF(null);
    setTokensPerSecond([]);
    setCurrentPage("modelSelection");
  };

  const toggleThought = (messageIndex: number) => {
    setConversation((prev) =>
      prev.map((msg, index) =>
        index === messageIndex ? { ...msg, showThought: !msg.showThought } : msg
      )
    );
  };
  const fetchAvailableGGUFs = async (modelFormat: string) => {
    setIsFetching(true);
    console.log(HF_TO_GGUF[modelFormat as keyof typeof HF_TO_GGUF]);
    try {
      const response = await axios.get(
        `https://huggingface.co/api/models/${
          HF_TO_GGUF[modelFormat as keyof typeof HF_TO_GGUF]
        }`
      );
      console.log(response);
      const files = response.data.siblings.filter((file: any) =>
        file.rfilename.endsWith(".gguf")
      );
      setAvailableGGUFs(files.map((file: any) => file.rfilename));
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to fetch .gguf files from Hugging Face API."
      );
    } finally {
      setIsFetching(false);
    }
  };

  const handleFormatSelection = (format: string) => {
    setSelectedModelFormat(format);
    setAvailableGGUFs([]); // Clear any previous list
    fetchAvailableGGUFs(format); // Fetch .gguf files for selected format
  };

  const checkDownloadedModels = async () => {
    try {
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      const ggufFiles = files
        .filter((file) => file.name.endsWith(".gguf"))
        .map((file) => file.name);
      setDownloadedModels(ggufFiles);
    } catch (error) {
      console.error("Error checking downloaded models:", error);
    }
  };
  useEffect(() => {
    checkDownloadedModels();
  }, [currentPage]);

  const checkFileExists = async (filePath: string) => {
    try {
      const fileExists = await RNFS.exists(filePath);
      console.log("File exists:", fileExists);
      return fileExists;
    } catch (error) {
      console.error("Error checking file existence:", error);
      return false;
    }
  };
  const handleScroll = (event: any) => {
    const currentPosition = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    // Store current scroll position and content height
    scrollPositionRef.current = currentPosition;
    contentHeightRef.current = contentHeight;

    // If user has scrolled up more than 100px from bottom, disable auto-scroll
    const distanceFromBottom =
      contentHeight - scrollViewHeight - currentPosition;
    setAutoScrollEnabled(distanceFromBottom < 100);
  };

  const handleDownloadModel = async (file: string) => {
    const downloadUrl = `https://huggingface.co/${
      HF_TO_GGUF[selectedModelFormat as keyof typeof HF_TO_GGUF]
    }/resolve/main/${file}`;
    setIsDownloading(true);
    setProgress(0);

    const destPath = `${RNFS.DocumentDirectoryPath}/${file}`;
    if (await checkFileExists(destPath)) {
      const success = await loadModel(file);
      if (success) {
        Alert.alert(
          "Info",
          `File ${destPath} already exists, we will load it directly.`
        );
        setIsDownloading(false);
        return;
      }
    }
    try {
      console.log("before download");
      console.log(isDownloading);

      const destPath = await downloadModel(file, downloadUrl, (progress) =>
        setProgress(progress)
      );
      Alert.alert("Success", `Model downloaded to: ${destPath}`);

      // After downloading, load the model
      await loadModel(file);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Download failed: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const stopGeneration = async () => {
    try {
      await context.stopCompletion();
      setIsGenerating(false);
      setIsLoading(false);

      setConversation((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.role === "assistant") {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + "\n\n*Generation stopped by user*",
            },
          ];
        }
        return prev;
      });
    } catch (error) {
      console.error("Error stopping completion:", error);
    }
  };

  const loadModel = async (modelName: string) => {
    try {
      const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
      console.log("destPath : ", destPath);
      if (context) {
        await releaseAllLlama();
        setContext(null);
        setConversation(INITIAL_CONVERSATION);
      }
      const llamaContext = await initLlama({
        model: destPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 1,
      });
      setContext(llamaContext);
      Alert.alert("Model Loaded", "The model was successfully loaded.");
      return true;
    } catch (error) {
      console.log("error : ", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error Loading Model", errorMessage);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!context) {
      Alert.alert("Model Not Loaded", "Please load the model first.");
      return;
    }
    if (!userInput.trim()) {
      Alert.alert("Input Error", "Please enter a message.");
      return;
    }

    const newConversation: Message[] = [
      ...conversation,
      { role: "user", content: userInput },
    ];
    setConversation(newConversation);
    setUserInput("");
    setIsLoading(true);
    setIsGenerating(true);
    setAutoScrollEnabled(true);

    try {
      const stopWords = [
        "</s>",
        "<|end|>",
        "user:",
        "assistant:",
        "<|im_end|>",
        "<|eot_id|>",
        "<|end▁of▁sentence|>",
        "<|end_of_text|>",
        "<｜end▁of▁sentence｜>",
      ];
      const chat = newConversation;

      // Append a placeholder for the assistant's response
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          thought: undefined,
          showThought: false,
        },
      ]);
      let currentAssistantMessage = "";
      let currentThought = "";
      let inThinkBlock = false;
      interface CompletionData {
        token: string;
      }

      interface CompletionResult {
        timings: {
          predicted_per_second: number;
        };
      }

      const result: CompletionResult = await context.completion(
        {
          messages: chat,
          n_predict: 10000,
          stop: stopWords,
        },
        (data: CompletionData) => {
          const token = data.token; // Extract the token
          currentAssistantMessage += token; // Append token to the current message

          if (token.includes("<think>")) {
            inThinkBlock = true;
            currentThought = token.replace("<think>", "");
          } else if (token.includes("</think>")) {
            inThinkBlock = false;
            const finalThought = currentThought.replace("</think>", "").trim();

            setConversation((prev) => {
              const lastIndex = prev.length - 1;
              const updated = [...prev];

              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content.replace(
                  `<think>${finalThought}</think>`,
                  ""
                ),
                thought: finalThought,
              };

              return updated;
            });

            currentThought = "";
          } else if (inThinkBlock) {
            currentThought += token;
          }

          const visibleContent = currentAssistantMessage
            .replace(/<think>.*?<\/think>/gs, "")
            .trim();

          setConversation((prev) => {
            const lastIndex = prev.length - 1;
            const updated = [...prev];
            updated[lastIndex].content = visibleContent;
            return updated;
          });

          if (autoScrollEnabled && scrollViewRef.current) {
            requestAnimationFrame(() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            });
          }
        }
      );

      setTokensPerSecond((prev) => [
        ...prev,
        parseFloat(result.timings.predicted_per_second.toFixed(2)),
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error During Inference", errorMessage);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Initialize Whisper on component mount
  useEffect(() => {
    checkAndInitializeWhisper();
  }, []);

  const checkAndInitializeWhisper = async () => {
    try {
      const exists = await checkWhisperModelExists(whisperModelKey);
      
      if (exists) {
        console.log('Whisper model already downloaded, initializing...');
        await initializeWhisper();
      } else {
        console.log('Whisper model not found, will download when needed');
      }
    } catch (error) {
      console.error('Error checking Whisper model:', error);
    }
  };

  const downloadAndInitializeWhisper = async () => {
    setIsDownloadingWhisper(true);
    setWhisperDownloadProgress(0);

    try {
      const modelPath = await downloadWhisperModel(
        whisperModelKey,
        (progress) => {
          setWhisperDownloadProgress(progress);
        }
      );

      console.log('Whisper model downloaded, initializing...');
      await initializeWhisper();
      Alert.alert('Success', 'Voice input is now ready!');
    } catch (error) {
      console.error('Failed to download/initialize Whisper:', error);
      Alert.alert(
        'Error',
        'Failed to setup voice input. Please try again.'
      );
    } finally {
      setIsDownloadingWhisper(false);
    }
  };

  const initializeWhisper = async () => {
    try {
      const modelPath = getWhisperModelPath(whisperModelKey);
      const service = new SpeechToTextService(modelPath, selectedVoiceLanguage);
      await service.initialize();

      setSttService(service);
      setWhisperModelLoaded(true);
      console.log('Whisper STT initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper:', error);
      throw error;
    }
  };

  const handleAudioRecorded = async (audioPath: string) => {
    if (!sttService) {
      Alert.alert(
        'Voice Input Not Ready',
        'Would you like to download the voice recognition model?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download', onPress: downloadAndInitializeWhisper },
        ]
      );
      return;
    }

    setIsTranscribing(true);
    try {
      console.log('Starting transcription for:', audioPath);
      
      // Verify audio file
      const exists = await RNFS.exists(audioPath);
      if (!exists) {
        throw new Error('Audio file not found');
      }

      const stat = await RNFS.stat(audioPath);
      console.log(`Audio file size: ${(stat.size / 1024).toFixed(2)}KB`);

      if (stat.size < 1000) {
        throw new Error('Audio file is too small or corrupted');
      }

      // Add platform-specific file path prefix for Android
      let whisperPath = audioPath;
      if (Platform.OS === 'android' && !audioPath.startsWith('file://')) {
        whisperPath = `file://${audioPath}`;
      }

      console.log('Whisper input path:', whisperPath);

      const transcription = await sttService.transcribe(whisperPath, {
        language: selectedVoiceLanguage === 'auto' ? undefined : selectedVoiceLanguage,
        translate: false,
        speedUp: true,
      });

      console.log('Transcription result:', transcription);

      if (transcription && transcription.trim()) {
        setUserInput(transcription);
      } else {
        Alert.alert('No Speech Detected', 'Please try speaking again.');
      }

      // Clean up audio file
      try {
        await RNFS.unlink(audioPath);
        console.log('Audio file deleted');
      } catch (err) {
        console.warn('Failed to delete audio file:', err);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Transcription Error',
        `Failed to convert speech to text: ${errorMsg}\n\nPlease try again.`
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleLanguageChange = (language: SupportedLanguage) => {
    setSelectedVoiceLanguage(language);
    if (sttService) {
      sttService.setDefaultLanguage(language);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sttService) {
        sttService.release();
      }
    };
  }, [sttService]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Text style={styles.title}>Llama Chat</Text>
          {currentPage === "modelSelection" && !isDownloading && (
            <View style={styles.card}>
              <Text style={styles.subtitle}>Choose a model format</Text>
              {modelFormats.map((format) => (
                <TouchableOpacity
                  key={format.label}
                  style={[
                    styles.button,
                    selectedModelFormat === format.label &&
                      styles.selectedButton,
                  ]}
                  onPress={() => handleFormatSelection(format.label)}
                >
                  <Text style={styles.buttonText}>{format.label}</Text>
                </TouchableOpacity>
              ))}
              {selectedModelFormat && (
                <View>
                  <Text style={styles.subtitle}>Select a .gguf file</Text>
                  {isFetching && (
                    <ActivityIndicator size="small" color="#2563EB" />
                  )}
                  {availableGGUFs.map((file, index) => {
                    const isDownloaded = downloadedModels.includes(file);
                    return (
                      <View key={index} style={styles.modelContainer}>
                        <TouchableOpacity
                          style={[
                            styles.modelButton,
                            selectedGGUF === file && styles.selectedButton,
                            isDownloaded && styles.downloadedModelButton,
                          ]}
                          onPress={() =>
                            isDownloaded
                              ? (loadModel(file),
                                setCurrentPage("conversation"),
                                setSelectedGGUF(file))
                              : handleGGUFSelection(file)
                          }
                        >
                          <View style={styles.modelButtonContent}>
                            <View style={styles.modelStatusContainer}>
                              {isDownloaded ? (
                                <View style={styles.downloadedIndicator}>
                                  <Text style={styles.downloadedIcon}>▼</Text>
                                </View>
                              ) : (
                                <View style={styles.notDownloadedIndicator}>
                                  <Text style={styles.notDownloadedIcon}>
                                    ▽
                                  </Text>
                                </View>
                              )}
                              <Text
                                style={[
                                  styles.buttonTextGGUF,
                                  selectedGGUF === file &&
                                    styles.selectedButtonText,
                                  isDownloaded && styles.downloadedText,
                                ]}
                              >
                                {file.split("-")[-1] == "imat"
                                  ? file
                                  : file.split("-").pop()}
                              </Text>
                            </View>
                            {isDownloaded && (
                              <View style={styles.loadModelIndicator}>
                                <Text style={styles.loadModelText}>
                                  TAP TO LOAD →
                                </Text>
                              </View>
                            )}
                            {!isDownloaded && (
                              <View style={styles.downloadIndicator}>
                                <Text style={styles.downloadText}>
                                  DOWNLOAD →
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Enhanced Whisper Model Section with Selector */}
              <View style={styles.whisperSection}>
                <Text style={styles.subtitle}>🎤 Voice Input (Optional)</Text>
                
                {/* Model Selection */}
                <View style={styles.whisperModelSelector}>
                  <Text style={styles.subtitle2}>Select Voice Recognition Model:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Object.entries(WHISPER_MODELS).map(([key, model]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.whisperModelCard,
                          whisperModelKey === key && styles.selectedWhisperModelCard,
                        ]}
                        onPress={() => setWhisperModelKey(key as WhisperModelKey)}
                      >
                        <Text style={[
                          styles.whisperModelName,
                          whisperModelKey === key && styles.selectedWhisperModelName,
                        ]}>
                          {model.description}
                        </Text>
                        <Text style={styles.whisperModelSize}>{model.size}</Text>
                        <View style={styles.whisperModelLanguages}>
                          {model.languages.slice(0, 4).map((lang, idx) => (
                            <Text key={idx} style={styles.languageTag}>
                              {lang.toUpperCase()}
                            </Text>
                          ))}
                          {model.languages.length > 4 && (
                            <Text style={styles.languageTag}>+{model.languages.length - 4}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {whisperModelLoaded ? (
                  <View style={styles.whisperLoadedContainer}>
                    <Text style={styles.whisperLoadedText}>
                      ✅ Voice input ready: {WHISPER_MODELS[whisperModelKey].name}
                    </Text>
                    
                    {/* Language Selection */}
                    <Text style={styles.subtitle2}>Select speaking language:</Text>
                    <View style={styles.languageButtons}>
                      {['hi', 'ml', 'kn', 'en'].map((lang) => (
                        <TouchableOpacity
                          key={lang}
                          style={[
                            styles.languageButton,
                            selectedVoiceLanguage === lang && styles.selectedLanguageButton,
                          ]}
                          onPress={() => handleLanguageChange(lang as SupportedLanguage)}
                        >
                          <Text style={[
                            styles.languageButtonText,
                            selectedVoiceLanguage === lang && styles.selectedLanguageButtonText,
                          ]}>
                            {lang === 'hi' ? '🇮🇳 हिंदी' : 
                             lang === 'ml' ? '🇮🇳 മലയാളം' :
                             lang === 'kn' ? '🇮🇳 ಕನ್ನಡ' : '🇬🇧 English'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Change Model Button */}
                    <TouchableOpacity
                      style={[styles.changeModelButton, { marginTop: 12 }]}
                      onPress={async () => {
                        if (sttService) {
                          await sttService.release();
                          setSttService(null);
                        }
                        setWhisperModelLoaded(false);
                        Alert.alert(
                          'Model Unloaded',
                          'Select a different model and download it to use voice input.'
                        );
                      }}
                    >
                      <Text style={styles.changeModelButtonText}>
                        🔄 Change Voice Model
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.subtitle2}>
                      Selected: {WHISPER_MODELS[whisperModelKey].description}
                    </Text>
                    {isDownloadingWhisper ? (
                      <View style={{ marginTop: 16 }}>
                        <ProgressBar progress={whisperDownloadProgress} />
                        <Text style={styles.greetingText}>
                          Downloading {WHISPER_MODELS[whisperModelKey].name}... {whisperDownloadProgress}%
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.button, { marginTop: 16 }]}
                        onPress={downloadAndInitializeWhisper}
                      >
                        <Text style={styles.buttonText}>
                          📥 Download {WHISPER_MODELS[whisperModelKey].name} ({WHISPER_MODELS[whisperModelKey].size})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
          {currentPage === "conversation" && !isDownloading && (
            <View style={styles.chatWrapper}>
              <Text style={styles.subtitle2}>Chatting with {selectedGGUF}</Text>
              <View style={styles.chatContainer}>
                <Text style={styles.greetingText}>
                  🦙 Welcome! The Llama is ready to chat. Ask away! 🎉
                </Text>
                {conversation.slice(1).map((msg, index) => (
                  <View key={index} style={styles.messageWrapper}>
                    <View
                      style={[
                        styles.messageBubble,
                        msg.role === "user"
                          ? styles.userBubble
                          : styles.llamaBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          msg.role === "user" && styles.userMessageText,
                        ]}
                      >
                        {msg.thought && (
                          <TouchableOpacity
                            onPress={() => toggleThought(index + 1)} // +1 to account for slice(1)
                            style={styles.toggleButton}
                          >
                            <Text style={styles.toggleText}>
                              {msg.showThought
                                ? "▼ Hide Thought"
                                : "▶ Show Thought"}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {msg.showThought && msg.thought && (
                          <View style={styles.thoughtContainer}>
                            <Text style={styles.thoughtTitle}>
                              Model's Reasoning:
                            </Text>
                            <Text style={styles.thoughtText}>
                              {msg.thought}
                            </Text>
                          </View>
                        )}
                        <Markdown>{msg.content}</Markdown>
                      </Text>
                    </View>
                    {msg.role === "assistant" && (
                      <Text
                        style={styles.tokenInfo}
                        onPress={() => console.log("index : ", index)}
                      >
                        {tokensPerSecond[Math.floor(index / 2)]} tokens/s
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
          {isDownloading && (
            <View style={styles.card}>
              <Text style={styles.subtitle}>Downloading : </Text>
              <Text style={styles.subtitle2}>{selectedGGUF}</Text>
              <ProgressBar progress={progress} />
            </View>
          )}
        </ScrollView>
        <View style={styles.bottomContainer}>
          {currentPage === "conversation" && (
            <>
              <View style={styles.inputContainer}>
                {/* Language selector in chat */}
                {whisperModelLoaded && (
                  <View style={styles.chatLanguageSelector}>
                    <Text style={styles.chatLanguageLabel}>Voice: </Text>
                    {['hi', 'ml', 'kn', 'en'].map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        style={[
                          styles.miniLanguageButton,
                          selectedVoiceLanguage === lang && styles.selectedMiniLanguageButton,
                        ]}
                        onPress={() => handleLanguageChange(lang as SupportedLanguage)}
                      >
                        <Text style={styles.miniLanguageText}>
                          {lang.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <View style={styles.inputRow}>
                  {/* Audio Recorder Button */}
                  <AudioRecorder
                    onAudioRecorded={handleAudioRecorded}
                    isProcessing={isTranscribing}
                    disabled={!whisperModelLoaded}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder={
                      isTranscribing
                        ? 'Transcribing...'
                        : whisperModelLoaded
                        ? 'Type or speak your message...'
                        : 'Type your message...'
                    }
                    placeholderTextColor="#94A3B8"
                    value={userInput}
                    onChangeText={setUserInput}
                    multiline
                    editable={!isTranscribing}
                  />

                  {isGenerating ? (
                    <TouchableOpacity
                      style={styles.stopButton}
                      onPress={stopGeneration}
                    >
                      <Text style={styles.buttonText}>□ Stop</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={handleSendMessage}
                      disabled={isLoading || isTranscribing}
                    >
                      <Text style={styles.buttonText}>
                        {isLoading ? '...' : 'Send'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToModelSelection}
              >
                <Text style={styles.backButtonText}>
                  ← Back to Model Selection
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1E293B",
    marginVertical: 24,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: "#475569",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 16,
    marginTop: 16,
  },
  subtitle2: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    color: "#93C5FD",
  },
  button: {
    backgroundColor: "#93C5FD", // Lighter blue
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: "#93C5FD", // Matching lighter shadow color
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15, // Slightly reduced opacity for subtle shadows
    shadowRadius: 4,
    elevation: 2,
  },
  selectedButton: {
    backgroundColor: "#2563EB",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  chatWrapper: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    backgroundColor: "#3B82F6",
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#3B82F6",
  },
  llamaBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageText: {
    fontSize: 16,
    color: "#334155",
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  tokenInfo: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "right",
  },
  inputContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#334155",
    minHeight: 50,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: "stretch",
    justifyContent: "center",
  },

  stopButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  greetingText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginVertical: 12,
    color: "#64748B", // Soft gray that complements #2563EB
  },
  thoughtContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#94A3B8",
  },
  thoughtTitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  thoughtText: {
    color: "#475569",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 16,
  },
  toggleButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "500",
  },

  bottomContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  modelContainer: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },

  modelButton: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  downloadedModelButton: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
    borderWidth: 1,
  },

  modelButtonContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modelStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  downloadedIndicator: {
    backgroundColor: "#DBEAFE",
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },

  notDownloadedIndicator: {
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },

  downloadedIcon: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "bold",
  },

  notDownloadedIcon: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "bold",
  },

  downloadedText: {
    color: "#1E40AF",
  },

  loadModelIndicator: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },

  loadModelText: {
    color: "#3B82F6",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  downloadIndicator: {
    backgroundColor: "#DCF9E5", // Light green background
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },

  downloadText: {
    color: "#16A34A", // Green text
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  buttonTextGGUF: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "500",
  },

  selectedButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Add new styles
  whisperSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  whisperModelSelector: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  whisperModelCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    alignItems: 'center',
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedWhisperModelCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#DBEAFE',
  },
  whisperModelName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 4,
  },
  selectedWhisperModelName: {
    color: "#1E40AF",
    fontWeight: "600",
  },
  whisperModelSize: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
  },
  whisperModelLanguages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  languageTag: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    color: '#1E40AF',
    fontSize: 10,
    fontWeight: '500',
  },
  whisperLoadedContainer: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
  },
  whisperLoadedText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  languageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  languageButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedLanguageButton: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  languageButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedLanguageButtonText: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  chatLanguageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  chatLanguageLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 8,
  },
  miniLanguageButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
  },
  selectedMiniLanguageButton: {
    backgroundColor: '#3B82F6',
  },
  miniLanguageText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  changeModelButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2563EB",
  },
  changeModelButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  
});

export default App;
