// Content script for Shift Speak Chrome Extension
// Injected into all web pages to capture audio and display captions

class ShiftSpeakContent {
  constructor() {
    this.isActive = false;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioStream = null;
    this.captionContainer = null;
    this.settings = {};
    
    this.init();
  }

  async init() {
    // Load settings
    await this.loadSettings();
    
    // Listen for messages from background script and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });

    // Create caption container
    this.createCaptionContainer();
    
    // Check if extension should be active on this page
    if (this.settings.enabled) {
      this.activate();
    }
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        this.settings = settings || {};
        resolve();
      });
    });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'toggle':
        this.toggle();
        sendResponse({ success: true });
        break;
        
      case 'settingsUpdated':
        this.settings = message.settings;
        if (this.settings.enabled && !this.isActive) {
          this.activate();
        } else if (!this.settings.enabled && this.isActive) {
          this.deactivate();
        }
        sendResponse({ success: true });
        break;
        
      case 'startRecording':
        this.startRecording();
        sendResponse({ success: true });
        break;
        
      case 'stopRecording':
        this.stopRecording();
        sendResponse({ success: true });
        break;
    }
  }

  createCaptionContainer() {
    // Remove existing container
    const existing = document.getElementById('shift-speak-captions');
    if (existing) {
      existing.remove();
    }

    this.captionContainer = document.createElement('div');
    this.captionContainer.id = 'shift-speak-captions';
    this.captionContainer.style.cssText = `
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      ${this.settings.captionPosition === 'top' ? 'top: 20px;' : 'bottom: 20px;'}
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: ${this.getFontSize()};
      max-width: 80vw;
      text-align: center;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease-in-out;
      pointer-events: none;
      display: none;
    `;

    document.body.appendChild(this.captionContainer);
  }

  getFontSize() {
    switch (this.settings.fontSize) {
      case 'small': return '14px';
      case 'large': return '20px';
      default: return '16px';
    }
  }

  activate() {
    this.isActive = true;
    console.log('Shift Speak activated on page');
    
    // Add visual indicator
    this.showStatus('Shift Speak activated - Click extension icon to start');
  }

  deactivate() {
    this.isActive = false;
    this.stopRecording();
    this.hideCaption();
    console.log('Shift Speak deactivated');
  }

  toggle() {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  async startRecording() {
    if (this.isRecording) {
      return;
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        await this.processAudio(audioBlob);
        audioChunks.length = 0;
      };

      this.mediaRecorder.start(3000); // Process every 3 seconds
      this.isRecording = true;
      this.showStatus('Recording... Speak now');

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.showStatus('Failed to access microphone');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    this.hideCaption();
  }

  async processAudio(audioBlob) {
    try {
      // Convert blob to array buffer for message passing
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Send to background script for transcription
      chrome.runtime.sendMessage({
        action: 'transcribeAudio',
        audioData: arrayBuffer,
        settings: this.settings
      }, async (response) => {
        if (response.success) {
          let result = response.result;
          
          // Get translation if needed
          if (this.settings.showTranslation && result.originalText) {
            const translationResponse = await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                action: 'translateText',
                text: result.originalText,
                settings: this.settings
              }, resolve);
            });
            
            if (translationResponse.success) {
              result.translatedText = translationResponse.result.translatedText;
            }
          }
          
          this.displayCaption(result);
        } else {
          console.error('Transcription failed:', response.error);
          this.showStatus('Transcription failed');
        }
      });
    } catch (error) {
      console.error('Audio processing failed:', error);
    }
  }

  displayCaption(result) {
    if (!this.captionContainer || !result.originalText) {
      return;
    }

    let captionText = '';
    
    if (this.settings.showOriginal && result.originalText) {
      captionText += result.originalText;
    }
    
    if (this.settings.showTranslation && result.translatedText) {
      if (captionText) captionText += '\n';
      captionText += result.translatedText;
    }

    if (result.speakerLabel && this.settings.speakerLabels) {
      captionText = `${result.speakerLabel}: ${captionText}`;
    }

    if (captionText.trim()) {
      this.captionContainer.textContent = captionText;
      this.captionContainer.style.display = 'block';
      this.captionContainer.style.opacity = '1';

      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.hideCaption();
      }, 5000);
    }
  }

  showStatus(message) {
    if (!this.captionContainer) return;
    
    this.captionContainer.textContent = message;
    this.captionContainer.style.display = 'block';
    this.captionContainer.style.opacity = '0.8';
    
    setTimeout(() => {
      this.hideCaption();
    }, 3000);
  }

  hideCaption() {
    if (this.captionContainer) {
      this.captionContainer.style.opacity = '0';
      setTimeout(() => {
        if (this.captionContainer) {
          this.captionContainer.style.display = 'none';
        }
      }, 300);
    }
  }
}

// Initialize content script
const shiftSpeak = new ShiftSpeakContent();