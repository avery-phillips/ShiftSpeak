import { useRef, useState, useCallback, useEffect } from "react";
import type { AudioChunk } from "@/types/transcription";

// Helper functions for Web Audio API processing
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return buffer;
}

function createWavBlob(audioBuffer: ArrayBuffer, sampleRate: number): Blob {
  const length = audioBuffer.byteLength;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);
  
  // Copy audio data
  const audioView = new Uint8Array(audioBuffer);
  const bufferView = new Uint8Array(buffer, 44);
  bufferView.set(audioView);
  
  return new Blob([buffer], { type: 'audio/wav' });
}

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

      const audioTrack = audioTracks[0];
      console.log("Audio track settings:", audioTrack.getSettings());
      console.log("Audio track enabled:", audioTrack.enabled);
      console.log("Audio track muted:", audioTrack.muted);
      console.log("Audio track ready state:", audioTrack.readyState);

      // Check if audio track is actually active
      if (audioTrack.muted || audioTrack.readyState !== 'live') {
        throw new Error("Audio track is not active. Make sure the selected tab is playing audio and 'Share tab audio' was checked.");
      }

      const audioStream = new MediaStream(audioTracks);
      streamRef.current = audioStream;
      console.log("Audio stream created:", audioStream);

      // Stop video tracks to save resources
      stream.getVideoTracks().forEach(track => track.stop());

      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate });
      const audioContext = audioContextRef.current;
      
      // Create MediaStreamAudioSourceNode from the audio stream
      const source = audioContext.createMediaStreamSource(audioStream);
      
      // Use AnalyserNode and MediaRecorder approach instead of deprecated ScriptProcessorNode
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Connect source to analyser for monitoring
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      console.log("Web Audio API setup completed with AnalyserNode");
      console.log("AudioContext state:", audioContext.state);
      console.log("AudioContext sample rate:", audioContext.sampleRate);
      
      // Resume audio context if needed
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log("AudioContext resumed for processing");
      }
      
      // Use MediaRecorder with the properly configured audio stream
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(audioStream, {
          mimeType: 'audio/webm;codecs=opus',
        });
      } catch (e) {
        // Fallback to default codec if opus is not supported
        mediaRecorder = new MediaRecorder(audioStream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      console.log("MediaRecorder created with MIME type:", mediaRecorder.mimeType);
      
      // Monitor audio levels to verify signal
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        if (average > 0) {
          console.log("Audio level detected:", average);
        }
        
        if (isRecording) {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      
      mediaRecorder.ondataavailable = (event) => {
        console.log("MediaRecorder data available:", event.data.size, "bytes");
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          event.data.arrayBuffer().then((buffer) => {
            console.log("Converting MediaRecorder data to ArrayBuffer:", buffer.byteLength, "bytes");
            const audioChunk: AudioChunk = {
              data: buffer,
              timestamp: Date.now(),
              duration: chunkDuration,
            };
            onAudioChunk?.(audioChunk);
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
        checkAudioLevel(); // Start audio level monitoring
      };
      
      // Start recording with smaller time slices for more frequent chunks
      mediaRecorder.start(chunkDuration);
      console.log("MediaRecorder started with timeslice:", chunkDuration, "ms");
      
      setIsRecording(true);
      console.log("Desktop audio capture started with Web Audio API");

      // Add a timeout to check if we're getting audio data
      setTimeout(() => {
        if (chunksRef.current.length === 0) {
          console.warn("No audio data received after 5 seconds. The selected source may not have audio playing.");
          setError("No audio detected. Make sure the selected tab is playing audio and 'Share tab audio' was checked during screen sharing.");
        }
      }, 5000);

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
