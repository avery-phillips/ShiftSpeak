export interface TranscriptionResult {
  originalText: string;
  translatedText?: string;
  speakerLabel?: string;
  timestamp: number;
  confidence?: number;
}

export interface TranscriptionSettings {
  sourceLanguage: string;
  targetLanguage: string;
  speakerLabels: boolean;
  lemonfoxApiKey: string;
}

/**
 * Core transcription manager that can be used in both web app and extension
 * Abstracts the transcription logic from the UI implementation
 */
export class TranscriptionManager {
  private apiKey: string;
  private settings: TranscriptionSettings;
  private onResult?: (result: TranscriptionResult) => void;
  private onError?: (error: string) => void;

  constructor(apiKey: string, settings: TranscriptionSettings) {
    this.apiKey = apiKey;
    this.settings = settings;
  }

  setResultCallback(callback: (result: TranscriptionResult) => void) {
    this.onResult = callback;
  }

  setErrorCallback(callback: (error: string) => void) {
    this.onError = callback;
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('settings', JSON.stringify(this.settings));

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.onResult?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.onError?.(errorMessage);
      throw error;
    }
  }

  updateSettings(newSettings: TranscriptionSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): TranscriptionSettings {
    return { ...this.settings };
  }
}