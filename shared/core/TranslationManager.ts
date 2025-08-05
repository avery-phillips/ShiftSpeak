export interface TranslationSettings {
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  translationService: 'openai' | 'google' | 'deepl';
}

/**
 * Core translation manager that can be used in both web app and extension
 * Handles translation logic independently of UI implementation
 */
export class TranslationManager {
  private apiKey: string;
  private settings: TranslationSettings;
  private onTranslation?: (originalText: string, translatedText: string) => void;
  private onError?: (error: string) => void;

  constructor(apiKey: string, settings: TranslationSettings) {
    this.apiKey = apiKey;
    this.settings = settings;
  }

  setTranslationCallback(callback: (originalText: string, translatedText: string) => void) {
    this.onTranslation = callback;
  }

  setErrorCallback(callback: (error: string) => void) {
    this.onError = callback;
  }

  async translateText(text: string, targetLanguage?: string): Promise<string> {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          text,
          targetLanguage: targetLanguage || this.settings.defaultTargetLanguage,
          sourceLanguage: this.settings.defaultSourceLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const result = await response.json();
      const translatedText = result.translatedText;
      
      this.onTranslation?.(text, translatedText);
      return translatedText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.onError?.(errorMessage);
      throw error;
    }
  }

  updateSettings(newSettings: TranslationSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): TranslationSettings {
    return { ...this.settings };
  }
}