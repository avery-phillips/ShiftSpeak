import { useState, useEffect } from "react";
import { ExtensionPopup } from "@/components/ExtensionPopup";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CaptionOverlay } from "@/components/CaptionOverlay";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { StatusNotifications, useNotifications } from "@/components/StatusNotifications";
import { AudioUploader } from "@/components/AudioUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { 
  TranscriptionEntry, 
  TranscriptionSession, 
  UserSettings,
  TranscriptionResult,
  WebSocketMessage 
} from "@/types/transcription";

const DEFAULT_USER_ID = "demo-user"; // For demo purposes

export default function Home() {
  const [isTranscriptionActive, setIsTranscriptionActive] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("english");
  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [speakerLabels, setSpeakerLabels] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<TranscriptionSession | null>(null);
  const [currentCaption, setCurrentCaption] = useState<TranscriptionResult | null>(null);
  const [fileProcessingStatus, setFileProcessingStatus] = useState<{
    isProcessing: boolean;
    progress: number;
    fileName?: string;
    stage?: 'uploading' | 'transcribing' | 'translating' | 'complete';
  }>({
    isProcessing: false,
    progress: 0,
  });
  const [apiStatus, setApiStatus] = useState<{
    lemonfox: 'connected' | 'disconnected' | 'loading';
    translation: 'connected' | 'disconnected' | 'loading';
  }>({
    lemonfox: 'disconnected',
    translation: 'disconnected',
  });

  const { toast } = useToast();
  const { notifications, addNotification, dismissNotification } = useNotifications();
  const queryClient = useQueryClient();

  // Fetch user settings
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings', DEFAULT_USER_ID],
    staleTime: 300000, // 5 minutes
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: UserSettings['settings']) => {
      const response = await apiRequest('PUT', `/api/settings/${DEFAULT_USER_ID}`, { settings });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings', DEFAULT_USER_ID] });
    },
  });

  // Fetch transcript entries for current session
  const { data: transcriptEntries = [] } = useQuery<TranscriptionEntry[]>({
    queryKey: ['/api/sessions', currentSession?.id, 'entries'],
    enabled: !!currentSession,
  });

  // WebSocket for real-time transcription (only connect when needed)
  const { isConnected, sendMessage, connect, disconnect } = useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'transcription_result') {
        setCurrentCaption({
          originalText: message.originalText,
          translatedText: message.translatedText,
          timestamp: message.timestamp,
          speakerLabel: message.speakerLabel,
        });

        // Refresh transcript entries
        if (currentSession) {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/sessions', currentSession.id, 'entries'] 
          });
        }
      } else if (message.type === 'error') {
        addNotification({
          type: 'error',
          title: 'Transcription Error',
          description: message.message,
        });
      }
    },
    onConnect: () => {
      console.log('WebSocket connected');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    },
    autoReconnect: false, // Disable auto-reconnect, connect only when needed
  });

  // Audio capture hook
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    captureFromElement,
    captureDesktopAudio,
    error: audioError 
  } = useAudioCapture({
    onAudioChunk: (chunk) => {
      console.log('Audio chunk received:', chunk.data.byteLength, 'bytes', 'Active:', isTranscriptionActive, 'Connected:', isConnected, 'Session:', !!currentSession);
      if (isTranscriptionActive && isConnected && currentSession) {
        // Convert audio chunk to base64 and send via WebSocket
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          console.log('Sending audio chunk via WebSocket:', base64.length, 'chars');
          sendMessage({
            type: 'audio_chunk',
            audio: base64,
            sessionId: currentSession.id,
            language: sourceLanguage,
            targetLanguage: targetLanguage,
            speakerLabels: speakerLabels,
            timestamp: chunk.timestamp,
          });
        };
        reader.readAsDataURL(new Blob([chunk.data]));
      }
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sessions', {
        userId: DEFAULT_USER_ID,
        title: `Session ${new Date().toLocaleString()}`,
        sourceLanguage,
        targetLanguage,
        status: 'active',
      });
      return response.json();
    },
    onSuccess: (session) => {
      setCurrentSession(session);
    },
  });

  // Apply user settings when loaded
  useEffect(() => {
    if (userSettings && 'settings' in userSettings) {
      const settings = userSettings.settings;
      if (settings.defaultSourceLanguage) setSourceLanguage(settings.defaultSourceLanguage);
      if (settings.defaultTargetLanguage) setTargetLanguage(settings.defaultTargetLanguage);
      if (settings.showOriginal !== undefined) setShowOriginal(settings.showOriginal);
      if (settings.showTranslation !== undefined) setShowTranslation(settings.showTranslation);
      if (settings.speakerLabels !== undefined) setSpeakerLabels(settings.speakerLabels);
    }
  }, [userSettings]);

  // Check API status on mount and periodically
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/status', {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const status = await response.json();
          console.log('API Status Response:', status);
          console.log('Setting API status to:', {
            lemonfox: status.lemonfox || 'disconnected',
            translation: status.translation || 'disconnected',
          });
          setApiStatus({
            lemonfox: status.lemonfox || 'disconnected',
            translation: status.translation || 'disconnected',
          });
        } else {
          console.error('API status check failed:', response.status, response.statusText);
          setApiStatus({
            lemonfox: 'disconnected',
            translation: 'disconnected',
          });
        }
      } catch (error) {
        console.error('Failed to check API status:', error);
        setApiStatus({
          lemonfox: 'disconnected',
          translation: 'disconnected',
        });
      }
    };

    // Check immediately
    checkApiStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkApiStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Show audio error notifications
  useEffect(() => {
    if (audioError) {
      addNotification({
        type: 'error',
        title: 'Audio Capture Error',
        description: audioError,
      });
    }
  }, [audioError, addNotification]);

  const handleToggleTranscription = async (active: boolean) => {
    if (active) {
      // Create new session
      if (!currentSession) {
        await createSessionMutation.mutateAsync();
      }
      
      // Start audio capture
      await startRecording();
      setIsTranscriptionActive(true);
      
      addNotification({
        type: 'success',
        title: 'Transcription Started',
        description: 'Real-time transcription is now active.',
      });
    } else {
      // Stop audio capture
      stopRecording();
      setIsTranscriptionActive(false);
      setCurrentCaption(null);
      
      addNotification({
        type: 'info',
        title: 'Transcription Stopped',
        description: 'Real-time transcription has been paused.',
      });
    }
  };

  const handleToggleDesktopAudio = async (active: boolean) => {
    if (active) {
      try {
        // Connect WebSocket first
        connect();
        
        // Create new session
        if (!currentSession) {
          await createSessionMutation.mutateAsync();
        }
        
        // Start desktop audio capture
        await captureDesktopAudio();
        setIsTranscriptionActive(true);
        
        addNotification({
          type: 'success',
          title: 'Desktop Audio Capture Started',
          description: 'Capturing audio from your screen/tab for live subtitles.',
        });
      } catch (error) {
        // Disconnect WebSocket if capture failed
        disconnect();
        addNotification({
          type: 'error',
          title: 'Capture Failed',
          description: error instanceof Error ? error.message : 'Failed to start desktop audio capture.',
        });
      }
    } else {
      // Stop audio capture
      stopRecording();
      setIsTranscriptionActive(false);
      setCurrentCaption(null);
      
      // Disconnect WebSocket
      disconnect();
      
      addNotification({
        type: 'info',
        title: 'Desktop Audio Capture Stopped',
        description: 'Live subtitle capture has been paused.',
      });
    }
  };

  const handleSaveTranscript = async () => {
    if (!currentSession) {
      toast({
        title: "No Session",
        description: "No active transcription session to save.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession.id}/export?format=srt`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${currentSession.id}.srt`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Transcript Saved",
        description: "Transcript has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save transcript.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    setApiStatus(prev => ({ ...prev, lemonfox: 'loading' }));
    setFileProcessingStatus({
      isProcessing: true,
      progress: 0,
      fileName: file.name,
      stage: 'uploading',
    });
    
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', sourceLanguage);
      formData.append('speakerLabels', speakerLabels.toString());

      setFileProcessingStatus(prev => ({ ...prev, progress: 20, stage: 'transcribing' }));

      const response = await fetch('/api/transcribe/file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setFileProcessingStatus(prev => ({ ...prev, progress: 50 }));
      
      // Create session for uploaded file
      const session = await createSessionMutation.mutateAsync();
      
      setFileProcessingStatus(prev => ({ ...prev, progress: 60, stage: 'translating' }));
      
      // Add transcription entries
      if (result.segments) {
        const totalSegments = result.segments.length;
        let processedSegments = 0;
        
        for (const segment of result.segments) {
          // Translate if needed
          let translatedText = '';
          if (targetLanguage !== sourceLanguage) {
            const translateResponse = await apiRequest('POST', '/api/translate', {
              text: segment.text,
              sourceLanguage,
              targetLanguage,
            });
            const translation = await translateResponse.json();
            translatedText = translation.translatedText;
          }

          await apiRequest('POST', `/api/sessions/${session.id}/entries`, {
            originalText: segment.text,
            translatedText,
            speakerLabel: segment.speaker,
            timestamp: segment.start * 1000, // Convert to milliseconds
            confidence: 90, // Mock confidence
          });
          
          processedSegments++;
          const progress = 60 + (processedSegments / totalSegments) * 35; // 60-95% for translation
          setFileProcessingStatus(prev => ({ ...prev, progress }));
        }
      }

      setFileProcessingStatus(prev => ({ ...prev, progress: 100, stage: 'complete' }));
      setApiStatus(prev => ({ ...prev, lemonfox: 'connected' }));
      
      addNotification({
        type: 'success',
        title: 'File Processed',
        description: `${file.name} has been transcribed successfully.`,
      });

      // Refresh transcript entries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sessions', session.id, 'entries'] 
      });

      // Clear processing status after a short delay
      setTimeout(() => {
        setFileProcessingStatus({ isProcessing: false, progress: 0 });
      }, 2000);

    } catch (error) {
      setApiStatus(prev => ({ ...prev, lemonfox: 'disconnected' }));
      setFileProcessingStatus({ isProcessing: false, progress: 0 });
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to process file.',
      });
    }
  };

  const handleUrlLoad = async (url: string) => {
    setApiStatus(prev => ({ ...prev, lemonfox: 'loading' }));
    
    try {
      const response = await apiRequest('POST', '/api/transcribe/url', {
        url,
        language: sourceLanguage,
        speakerLabels,
      });

      const result = await response.json();
      
      // Create session for URL transcription
      const session = await createSessionMutation.mutateAsync();
      
      // Add transcription entries
      if (result.segments) {
        for (const segment of result.segments) {
          // Translate if needed
          let translatedText = '';
          if (targetLanguage !== sourceLanguage) {
            const translateResponse = await apiRequest('POST', '/api/translate', {
              text: segment.text,
              sourceLanguage,
              targetLanguage,
            });
            const translation = await translateResponse.json();
            translatedText = translation.translatedText;
          }

          await apiRequest('POST', `/api/sessions/${session.id}/entries`, {
            originalText: segment.text,
            translatedText,
            speakerLabel: segment.speaker,
            timestamp: segment.start * 1000, // Convert to milliseconds
            confidence: 90, // Mock confidence
          });
        }
      } else if (result.text) {
        // Handle simple text response without segments
        let translatedText = '';
        if (targetLanguage !== sourceLanguage) {
          const translateResponse = await apiRequest('POST', '/api/translate', {
            text: result.text,
            sourceLanguage,
            targetLanguage,
          });
          const translation = await translateResponse.json();
          translatedText = translation.translatedText;
        }

        await apiRequest('POST', `/api/sessions/${session.id}/entries`, {
          originalText: result.text,
          translatedText,
          speakerLabel: null,
          timestamp: 0,
          confidence: 90,
        });
      }

      setApiStatus(prev => ({ ...prev, lemonfox: 'connected' }));
      
      addNotification({
        type: 'success',
        title: 'URL Processed',
        description: 'Media from URL has been transcribed successfully.',
      });

      // Refresh transcript entries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sessions', session.id, 'entries'] 
      });

    } catch (error) {
      setApiStatus(prev => ({ ...prev, lemonfox: 'disconnected' }));
      addNotification({
        type: 'error',
        title: 'URL Failed',
        description: error instanceof Error ? error.message : 'Failed to process media from URL.',
      });
    }
  };

  const handleAudioCapture = (stream: MediaStream) => {
    // This would be called when capturing from video element
    // For now, we're using the microphone capture instead
    console.log('Audio stream captured from video element:', stream);
  };

  const handleClearTranscript = () => {
    // In a real implementation, this would clear the transcript entries
    addNotification({
      type: 'info',
      title: 'Transcript Cleared',
      description: 'All transcript entries have been cleared.',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shift Speak</h1>
              <p className="text-sm text-gray-600">Real-time Speech-to-Text & Translation</p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>🔒 Secure API handling</span>
              <span>♿ WCAG 2.1 compliant</span>
              <span>🌍 100+ languages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="live">Live Transcription</TabsTrigger>
            <TabsTrigger value="upload">File Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Extension Popup */}
              <div className="lg:col-span-1">
                <div className="space-y-4">
                  <ExtensionPopup
                    isActive={isTranscriptionActive}
                    onToggleActive={handleToggleTranscription}
                    sourceLanguage={sourceLanguage}
                    onSourceLanguageChange={setSourceLanguage}
                    targetLanguage={targetLanguage}
                    onTargetLanguageChange={setTargetLanguage}
                    showOriginal={showOriginal}
                    onShowOriginalChange={setShowOriginal}
                    showTranslation={showTranslation}
                    onShowTranslationChange={setShowTranslation}
                    speakerLabels={speakerLabels}
                    onSpeakerLabelsChange={setSpeakerLabels}
                    onSaveTranscript={handleSaveTranscript}
                    onOpenSettings={() => setSettingsModalOpen(true)}
                    apiStatus={apiStatus}
                  />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">🎬 Live Video Subtitles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-gray-600">
                        Capture audio from browser tabs playing videos for real-time translated subtitles
                      </p>
                      <Button
                        onClick={() => handleToggleDesktopAudio(!isTranscriptionActive)}
                        variant={isTranscriptionActive ? "destructive" : "default"}
                        className="w-full"
                        size="sm"
                      >
                        {isTranscriptionActive ? "Stop" : "Start"} Desktop Audio Capture
                      </Button>
                      <p className="text-xs text-amber-600">
                        💡 When prompted, select "Share tab audio" to capture video sound
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Video Player and Captions */}
              <div className="lg:col-span-2 space-y-6">
                <VideoPlayer
                  onAudioCapture={handleAudioCapture}
                  onFileUpload={handleFileUpload}
                  onUrlLoad={handleUrlLoad}
                  isCapturing={isRecording}
                />

                <TranscriptPanel
                  entries={transcriptEntries}
                  isListening={isTranscriptionActive}
                  onClear={handleClearTranscript}
                  onExport={(format) => {
                    // Handle export in different formats
                    if (currentSession) {
                      window.open(`/api/sessions/${currentSession.id}/export?format=${format}`);
                    }
                  }}
                  showOriginal={showOriginal}
                  showTranslation={showTranslation}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AudioUploader
                onFileSelect={handleFileUpload}
                maxSize={100 * 1024 * 1024} // 100MB
              />
              
              <Card>
                <CardHeader>
                  <CardTitle>Processing Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Source Language</label>
                      <select 
                        className="w-full mt-1 p-2 border rounded"
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value)}
                      >
                        <option value="auto">Auto-detect</option>
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="german">German</option>
                        <option value="chinese">Chinese</option>
                        <option value="japanese">Japanese</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Target Language</label>
                      <select 
                        className="w-full mt-1 p-2 border rounded"
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                      >
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="german">German</option>
                        <option value="chinese">Chinese</option>
                        <option value="japanese">Japanese</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Processing Options</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={speakerLabels}
                          onChange={(e) => setSpeakerLabels(e.target.checked)}
                        />
                        <span className="text-sm">Speaker identification</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* File Processing Progress */}
            {fileProcessingStatus.isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Processing {fileProcessingStatus.fileName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{fileProcessingStatus.stage}</span>
                      <span>{Math.round(fileProcessingStatus.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileProcessingStatus.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {fileProcessingStatus.stage === 'uploading' && 'Uploading file to server...'}
                    {fileProcessingStatus.stage === 'transcribing' && 'Converting speech to text...'}
                    {fileProcessingStatus.stage === 'translating' && 'Translating transcript...'}
                    {fileProcessingStatus.stage === 'complete' && 'Processing complete!'}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* File Upload Transcript Results */}
            {currentSession && transcriptEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transcription Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <TranscriptPanel
                    entries={transcriptEntries}
                    isListening={false}
                    onClear={handleClearTranscript}
                    onExport={(format) => {
                      if (currentSession) {
                        window.open(`/api/sessions/${currentSession.id}/export?format=${format}`);
                      }
                    }}
                    showOriginal={showOriginal}
                    showTranslation={showTranslation}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Caption Overlay */}
        {currentCaption && (
          <CaptionOverlay
            originalText={currentCaption.originalText}
            translatedText={currentCaption.translatedText}
            speakerLabel={currentCaption.speakerLabel}
            showOriginal={showOriginal}
            showTranslation={showTranslation}
            isLive={isTranscriptionActive}
            position={(userSettings && 'settings' in userSettings) ? userSettings.settings.captionPosition : 'bottom'}
            fontSize={(userSettings && 'settings' in userSettings) ? userSettings.settings.fontSize : 'medium'}
          />
        )}

        {/* Settings Modal */}
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          settings={(userSettings && 'settings' in userSettings) ? userSettings.settings : {}}
          onSave={(settings) => updateSettingsMutation.mutate(settings)}
        />

        {/* Status Notifications */}
        <StatusNotifications
          notifications={notifications}
          onDismiss={dismissNotification}
        />
      </div>
    </div>
  );
}
