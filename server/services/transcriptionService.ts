export interface TranscriptionOptions {
  language?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  speakerLabels?: boolean;
  minSpeakers?: number;
  maxSpeakers?: number;
  prompt?: string;
  translate?: boolean;
  timestampGranularities?: string[];
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
}

export class LemonfoxTranscriptionService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.LEMONFOX_API_KEY || process.env.VITE_LEMONFOX_API_KEY || '';
    this.baseUrl = 'https://api.lemonfox.ai/v1';
    
    if (!this.apiKey) {
      throw new Error('LEMONFOX_API_KEY environment variable is required');
    }
  }

  async transcribeAudio(audioData: Buffer | string, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    const formData = new FormData();
    
    // Handle both file uploads and URLs
    if (typeof audioData === 'string') {
      formData.append('file', audioData); // URL
    } else {
      formData.append('file', new Blob([audioData]));
    }

    // Add optional parameters
    if (options.language) {
      formData.append('language', options.language);
    }
    
    formData.append('response_format', options.responseFormat || 'verbose_json');
    
    if (options.speakerLabels) {
      formData.append('speaker_labels', 'true');
      if (options.minSpeakers) {
        formData.append('min_speakers', options.minSpeakers.toString());
      }
      if (options.maxSpeakers) {
        formData.append('max_speakers', options.maxSpeakers.toString());
      }
    }

    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }

    if (options.translate) {
      formData.append('translate', 'true');
    }

    if (options.timestampGranularities) {
      options.timestampGranularities.forEach(granularity => {
        formData.append('timestamp_granularities[]', granularity);
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Lemonfox API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      
      // Handle different response formats
      if (options.responseFormat === 'verbose_json') {
        return {
          text: result.text,
          duration: result.duration,
          segments: result.segments?.map((segment: any) => ({
            text: segment.text,
            start: segment.start,
            end: segment.end,
            speaker: segment.speaker,
          })),
        };
      } else {
        return {
          text: typeof result === 'string' ? result : result.text,
        };
      }
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async transcribeAudioStream(audioChunk: Buffer, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    // For real-time transcription, we'll send smaller chunks
    return this.transcribeAudio(audioChunk, {
      ...options,
      responseFormat: 'json', // Simpler format for real-time
    });
  }
}
