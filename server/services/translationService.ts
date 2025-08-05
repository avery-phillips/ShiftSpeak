import OpenAI from "openai";

export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  context?: string;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage?: string;
  confidence?: number;
}

export class OpenAITranslationService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
  }

  async translateText(text: string, options: TranslationOptions): Promise<TranslationResult> {
    try {
      const systemPrompt = this.buildSystemPrompt(options);
      const userPrompt = this.buildUserPrompt(text, options);

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Low temperature for more consistent translations
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        translatedText: result.translation || text,
        sourceLanguage: result.detected_language || options.sourceLanguage,
        confidence: result.confidence || 0.9,
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Failed to translate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildSystemPrompt(options: TranslationOptions): string {
    return `You are a professional translator specializing in real-time caption translation. 
Your task is to translate text accurately while preserving the original meaning and context.

Instructions:
- Translate the provided text from ${options.sourceLanguage || 'the detected language'} to ${options.targetLanguage}
- Maintain the original tone and style
- Preserve proper nouns, technical terms, and brand names when appropriate
- For unclear or ambiguous text, provide the most likely translation
- If the text is already in the target language, return it unchanged
- Respond in JSON format with the following structure:
{
  "translation": "translated text",
  "detected_language": "detected source language code",
  "confidence": 0.95
}`;
  }

  private buildUserPrompt(text: string, options: TranslationOptions): string {
    let prompt = `Translate this text to ${options.targetLanguage}: "${text}"`;
    
    if (options.context) {
      prompt += `\n\nContext: ${options.context}`;
    }
    
    return prompt;
  }

  async batchTranslate(texts: string[], options: TranslationOptions): Promise<TranslationResult[]> {
    // For better performance, we can batch multiple translations
    const batchPromise = texts.map(text => this.translateText(text, options));
    return Promise.all(batchPromise);
  }
}

// Alternative translation services can be added here
export class GoogleTranslateService {
  // Implementation for Google Translate API
  async translateText(text: string, options: TranslationOptions): Promise<TranslationResult> {
    // TODO: Implement Google Translate API integration
    throw new Error('Google Translate service not implemented');
  }
}

export class DeepLTranslationService {
  // Implementation for DeepL API
  async translateText(text: string, options: TranslationOptions): Promise<TranslationResult> {
    // TODO: Implement DeepL API integration
    throw new Error('DeepL service not implemented');
  }
}
