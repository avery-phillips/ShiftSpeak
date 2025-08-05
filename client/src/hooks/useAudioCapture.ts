import { useRef, useState, useCallback, useEffect } from "react";
import type { AudioChunk } from "@/types/transcription";

interface UseAudioCaptureOptions {
  onAudioChunk?: (chunk: AudioChunk) => void;
  chunkDuration?: number; // milliseconds
  sampleRate?: number;
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}) {
  const {
    onAudioChunk,
    chunkDuration = 1000, // 1 second chunks
    sampleRate = 16000,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check for browser support
  useEffect(() => {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setIsSupported(supported);
    
    if (!supported) {
      setError("Audio capture is not supported in this browser");
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError("Audio capture is not supported");
      return;
    }

    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate });
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Convert blob to ArrayBuffer and call callback
          event.data.arrayBuffer().then((buffer) => {
            const chunk: AudioChunk = {
              data: buffer,
              timestamp: Date.now(),
              duration: chunkDuration,
            };
            onAudioChunk?.(chunk);
          });
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording error occurred");
        stopRecording();
      };

      mediaRecorder.start(chunkDuration);
      setIsRecording(true);

    } catch (err) {
      console.error("Error starting recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
    }
  }, [isSupported, sampleRate, chunkDuration, onAudioChunk]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  // Function to capture audio from video/audio elements
  const captureFromElement = useCallback(async (element: HTMLVideoElement | HTMLAudioElement) => {
    try {
      setError(null);
      
      // Create audio context
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;
      
      // Create media element source
      const source = audioContext.createMediaElementSource(element);
      
      // Create script processor for audio chunks
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert Float32Array to ArrayBuffer
        const buffer = new ArrayBuffer(inputData.length * 4);
        const view = new Float32Array(buffer);
        view.set(inputData);
        
        const chunk: AudioChunk = {
          data: buffer,
          timestamp: Date.now(),
          duration: (inputData.length / sampleRate) * 1000,
        };
        
        onAudioChunk?.(chunk);
      };
      
      // Connect nodes
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      
      // Return cleanup function
      return () => {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        setIsRecording(false);
      };
      
    } catch (err) {
      console.error("Error capturing from element:", err);
      setError(err instanceof Error ? err.message : "Failed to capture audio from element");
      return () => {};
    }
  }, [sampleRate, onAudioChunk]);

  const captureDesktopAudio = useCallback(async () => {
    if (!isSupported) {
      setError("Audio capture is not supported");
      return;
    }

    try {
      setError(null);
      console.log("Starting desktop audio capture...");
      
      // Request screen/tab sharing with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } as any,
      });

      console.log("Display media stream obtained:", stream);
      console.log("Audio tracks:", stream.getAudioTracks().length);
      console.log("Video tracks:", stream.getVideoTracks().length);

      // Extract only the audio track
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("No audio track available from screen capture. Make sure to select 'Share tab audio' when prompted.");
      }

      const audioStream = new MediaStream(audioTracks);
      streamRef.current = audioStream;
      console.log("Audio stream created:", audioStream);

      // Stop video tracks to save resources
      stream.getVideoTracks().forEach(track => track.stop());

      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate });
      
      // Create MediaRecorder for audio only
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      console.log("MediaRecorder created, starting recording...");

      mediaRecorder.ondataavailable = (event) => {
        console.log("MediaRecorder data available:", event.data.size, "bytes");
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Convert blob to ArrayBuffer and call callback
          event.data.arrayBuffer().then((buffer) => {
            console.log("Converting audio chunk to ArrayBuffer:", buffer.byteLength, "bytes");
            const chunk: AudioChunk = {
              data: buffer,
              timestamp: Date.now(),
              duration: chunkDuration,
            };
            onAudioChunk?.(chunk);
          });
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError('Recording error occurred');
        setIsRecording(false);
      };

      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started successfully");
      };

      mediaRecorder.start(chunkDuration);
      setIsRecording(true);
      console.log("Desktop audio capture started with chunk duration:", chunkDuration);

    } catch (error) {
      console.error("Desktop audio capture error:", error);
      setError(`Failed to capture desktop audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isSupported, chunkDuration, onAudioChunk, sampleRate]);

  return {
    isRecording,
    isSupported,
    error,
    startRecording,
    stopRecording,
    captureFromElement,
    captureDesktopAudio,
  };
}
