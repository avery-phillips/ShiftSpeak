import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { LemonfoxTranscriptionService } from "./services/transcriptionService";
import { OpenAITranslationService } from "./services/translationService";
import { insertTranscriptionSessionSchema, insertTranscriptionEntrySchema, insertUserSettingsSchema } from "@shared/schema";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const transcriptionService = new LemonfoxTranscriptionService();
  const translationService = new OpenAITranslationService();

  // API Routes
  
  // Status endpoint
  app.get("/api/status", async (req, res) => {
    try {
      // Test API connections
      const lemonfoxStatus = await testLemonfoxConnection();
      const openaiStatus = await testOpenAIConnection();
      
      res.json({
        lemonfox: lemonfoxStatus,
        translation: openaiStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error checking API status:", error);
      res.status(500).json({ 
        error: "Failed to check API status",
        lemonfox: 'error',
        translation: 'error'
      });
    }
  });

  // Test API connections
  async function testLemonfoxConnection(): Promise<'connected' | 'disconnected' | 'error'> {
    try {
      // Just check if API key exists for now to avoid making actual API calls
      const apiKey = process.env.LEMONFOX_API_KEY;
      return apiKey ? 'connected' : 'disconnected';
    } catch (error) {
      console.error("Lemonfox connection test failed:", error);
      return 'disconnected';
    }
  }

  async function testOpenAIConnection(): Promise<'connected' | 'disconnected' | 'error'> {
    try {
      // Just check if API key exists for now to avoid making actual API calls
      const apiKey = process.env.OPENAI_API_KEY;
      return apiKey ? 'connected' : 'disconnected';
    } catch (error) {
      console.error("OpenAI connection test failed:", error);
      return 'disconnected';
    }
  }
  
  // Create a new transcription session
  app.post("/api/sessions", async (req, res) => {
    try {
      const validatedData = insertTranscriptionSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create session" });
    }
  });

  // Get user sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId parameter is required" });
      }
      
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Get specific session
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Update session
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // Get session entries (transcript)
  app.get("/api/sessions/:id/entries", async (req, res) => {
    try {
      const entries = await storage.getSessionEntries(req.params.id);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ error: "Failed to fetch transcript entries" });
    }
  });

  // Add entry to session (transcript entry)
  app.post("/api/sessions/:id/entries", async (req, res) => {
    try {
      const validatedData = insertTranscriptionEntrySchema.parse({
        ...req.body,
        sessionId: req.params.id,
      });
      
      const entry = await storage.addTranscriptionEntry(validatedData);
      res.json(entry);
    } catch (error) {
      console.error("Error adding entry:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to add transcript entry" });
    }
  });

  // Upload audio file for transcription
  app.post("/api/transcribe/file", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const options = {
        language: req.body.language || 'auto',
        responseFormat: 'verbose_json' as const,
        speakerLabels: req.body.speakerLabels === 'true',
        minSpeakers: req.body.minSpeakers ? parseInt(req.body.minSpeakers) : undefined,
        maxSpeakers: req.body.maxSpeakers ? parseInt(req.body.maxSpeakers) : undefined,
        prompt: req.body.prompt,
      };

      const result = await transcriptionService.transcribeAudio(req.file.buffer, options);
      res.json(result);
    } catch (error) {
      console.error("Error transcribing file:", error);
      if (error instanceof Error && error.message.includes('File format not supported')) {
        res.status(400).json({ error: "Failed to process media from file. Please check the file format or try a different audio/video file." });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to transcribe audio" });
      }
    }
  });

  // Transcribe from URL
  app.post("/api/transcribe/url", async (req, res) => {
    try {
      const { url, language, speakerLabels, prompt } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL format
      try {
        const urlObj = new URL(url);
        
        // Check for unsupported platforms
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
          return res.status(400).json({ 
            error: "YouTube URLs are not supported. Please use direct links to audio/video files (e.g., .mp3, .wav, .mp4)" 
          });
        }
        
        if (urlObj.hostname.includes('tiktok.com') || urlObj.hostname.includes('instagram.com') || urlObj.hostname.includes('twitter.com')) {
          return res.status(400).json({ 
            error: "Social media URLs are not supported. Please use direct links to audio/video files (e.g., .mp3, .wav, .mp4)" 
          });
        }
        
      } catch (error) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      console.log('Transcribing URL:', url);

      const options = {
        language: language || 'auto',
        responseFormat: 'verbose_json' as const,
        speakerLabels: speakerLabels === true,
        prompt,
      };

      const result = await transcriptionService.transcribeAudio(url, options);
      res.json(result);
    } catch (error) {
      console.error("Error transcribing URL:", error);
      if (error instanceof Error && error.message.includes('File format not supported')) {
        res.status(400).json({ error: "Failed to process media from URL. Please check the file format or try a different audio/video file." });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to transcribe audio from URL" });
      }
    }
  });

  // Translate text
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, sourceLanguage, targetLanguage, context } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Text and target language are required" });
      }

      const result = await translationService.translateText(text, {
        sourceLanguage,
        targetLanguage,
        context,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error translating text:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to translate text" });
    }
  });

  // User settings
  app.get("/api/settings/:userId", async (req, res) => {
    try {
      const settings = await storage.getUserSettings(req.params.userId);
      if (!settings) {
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings/:userId", async (req, res) => {
    try {
      const validatedData = insertUserSettingsSchema.parse({
        userId: req.params.userId,
        settings: req.body.settings,
      });
      
      const settings = await storage.updateUserSettings(req.params.userId, validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update settings" });
    }
  });

  // Export transcript
  app.get("/api/sessions/:id/export", async (req, res) => {
    try {
      const format = req.query.format as string || 'srt';
      const entries = await storage.getSessionEntries(req.params.id);
      
      let content = '';
      let contentType = 'text/plain';
      let filename = `transcript.${format}`;

      switch (format) {
        case 'srt':
          content = generateSRT(entries);
          contentType = 'application/x-subrip';
          filename = 'transcript.srt';
          break;
        case 'vtt':
          content = generateVTT(entries);
          contentType = 'text/vtt';
          filename = 'transcript.vtt';
          break;
        case 'txt':
          content = entries.map(entry => 
            `${entry.speakerLabel ? `[${entry.speakerLabel}] ` : ''}${entry.originalText}`
          ).join('\n');
          filename = 'transcript.txt';
          break;
        default:
          return res.status(400).json({ error: "Unsupported format" });
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      console.error("Error exporting transcript:", error);
      res.status(500).json({ error: "Failed to export transcript" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time transcription
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data.type, 'Audio size:', data.audio ? data.audio.length : 'N/A');
        
        if (data.type === 'audio_chunk') {
          // Handle real-time audio transcription
          const audioBuffer = Buffer.from(data.audio, 'base64');
          console.log('Processing audio chunk:', audioBuffer.length, 'bytes');
          
          const options = {
            language: data.language || 'auto',
            responseFormat: 'json' as const,
            speakerLabels: data.speakerLabels || false,
          };

          console.log('Transcription options:', options);
          const result = await transcriptionService.transcribeAudioStream(audioBuffer, options);
          console.log('Transcription result:', result);
          
          // Translate if needed
          let translatedText = '';
          if (data.targetLanguage && data.targetLanguage !== (data.language || 'english')) {
            const translation = await translationService.translateText(result.text, {
              sourceLanguage: data.language,
              targetLanguage: data.targetLanguage,
            });
            translatedText = translation.translatedText;
          }

          // Store the entry if sessionId is provided
          if (data.sessionId) {
            await storage.addTranscriptionEntry({
              sessionId: data.sessionId,
              originalText: result.text,
              translatedText,
              speakerLabel: data.speakerLabel,
              timestamp: data.timestamp || Date.now(),
              confidence: Math.round((result.duration || 1) * 90), // Mock confidence based on duration
            });
          }

          // Send back the transcription result
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'transcription_result',
              originalText: result.text,
              translatedText,
              timestamp: data.timestamp || Date.now(),
              speakerLabel: data.speakerLabel,
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}

// Helper functions for export formats
function generateSRT(entries: any[]): string {
  return entries.map((entry, index) => {
    const start = formatSRTTime(entry.timestamp);
    const end = formatSRTTime(entry.timestamp + 3000); // Assume 3 second duration
    return `${index + 1}\n${start} --> ${end}\n${entry.originalText}\n`;
  }).join('\n');
}

function generateVTT(entries: any[]): string {
  const header = 'WEBVTT\n\n';
  const content = entries.map(entry => {
    const start = formatVTTTime(entry.timestamp);
    const end = formatVTTTime(entry.timestamp + 3000);
    return `${start} --> ${end}\n${entry.originalText}\n`;
  }).join('\n');
  return header + content;
}

function formatSRTTime(ms: number): string {
  const date = new Date(ms);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

function formatVTTTime(ms: number): string {
  const date = new Date(ms);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}
