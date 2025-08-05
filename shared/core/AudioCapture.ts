/**
 * Audio capture utility that works in both web app and extension contexts
 * Handles microphone access and audio stream management
 */
export class AudioCapture {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private onData?: (audioBlob: Blob) => void;
  private onError?: (error: string) => void;

  constructor() {}

  setDataCallback(callback: (audioBlob: Blob) => void) {
    this.onData = callback;
  }

  setErrorCallback(callback: (error: string) => void) {
    this.onError = callback;
  }

  async startCapture(options: {
    sampleRate?: number;
    channelCount?: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
  } = {}): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: options.sampleRate || 44100,
          channelCount: options.channelCount || 1,
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        this.onData?.(audioBlob);
        this.audioChunks = [];
      };

      this.mediaRecorder.onerror = (event) => {
        const errorEvent = event as ErrorEvent;
        this.onError?.(`Recording error: ${errorEvent.error?.message || 'Unknown error'}`);
      };

      this.mediaRecorder.start(1000); // Collect data every second
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.onError?.(`Failed to start audio capture: ${errorMessage}`);
      throw error;
    }
  }

  stopCapture(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
  }

  isCapturing(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }
}