export interface TranscriptionEntry {
  id: string;
  sessionId: string;
  originalText: string;
  translatedText?: string;
  speakerLabel?: string;
  timestamp: number;
  confidence?: number;
  createdAt: Date;
}

export interface TranscriptionSession {
  id: string;
  userId?: string;
  title?: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  settings: {
    // API Configuration
    lemonfoxApiKey?: string;
    translationService?: 'openai' | 'google' | 'deepl' | 'libretranslate';
    
    // Performance
    transcriptionDelay?: number;
    useEuServers?: boolean;
    
    // Caption Display
    showOriginal?: boolean;
    showTranslation?: boolean;
    speakerLabels?: boolean;
    
    // Caption Styling
    fontSize?: 'small' | 'medium' | 'large' | 'xlarge';
    captionPosition?: 'bottom' | 'top' | 'center';
    
    // Default Languages
    defaultSourceLanguage?: string;
    defaultTargetLanguage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  duration: number;
}

export interface TranscriptionResult {
  originalText: string;
  translatedText?: string;
  timestamp: number;
  speakerLabel?: string;
  confidence?: number;
}

export interface WebSocketMessage {
  type: 'audio_chunk' | 'transcription_result' | 'error' | 'status';
  [key: string]: any;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'english', name: 'English' },
  { code: 'spanish', name: 'Spanish' },
  { code: 'french', name: 'French' },
  { code: 'german', name: 'German' },
  { code: 'chinese', name: 'Chinese' },
  { code: 'japanese', name: 'Japanese' },
  { code: 'portuguese', name: 'Portuguese' },
  { code: 'russian', name: 'Russian' },
  { code: 'italian', name: 'Italian' },
  { code: 'dutch', name: 'Dutch' },
  { code: 'korean', name: 'Korean' },
  { code: 'arabic', name: 'Arabic' },
  { code: 'hindi', name: 'Hindi' },
  { code: 'turkish', name: 'Turkish' },
];

export const TRANSLATION_SERVICES = [
  { value: 'openai', label: 'OpenAI GPT-4o' },
  { value: 'google', label: 'Google Translate' },
  { value: 'deepl', label: 'DeepL' },
  { value: 'libretranslate', label: 'LibreTranslate' },
];
