// Popup script for Shift Speak Chrome Extension
// Handles the extension popup interface

class ShiftSpeakPopup {
  constructor() {
    this.settings = {};
    this.isRecording = false;
    this.currentTab = null;
    
    this.init();
  }

  async init() {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
    
    // Load settings
    await this.loadSettings();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        this.settings = settings || this.getDefaultSettings();
        resolve();
      });
    });
  }

  getDefaultSettings() {
    return {
      enabled: false,
      sourceLanguage: 'auto',
      targetLanguage: 'english',
      showOriginal: true,
      showTranslation: true,
      speakerLabels: true,
      captionPosition: 'bottom',
      fontSize: 'medium',
      apiKeys: {
        lemonfox: '',
        openai: ''
      }
    };
  }

  setupEventListeners() {
    // Enable toggle
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('click', () => {
      this.settings.enabled = !this.settings.enabled;
      this.saveSettings();
      this.updateUI();
    });

    // Recording controls
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    startBtn.addEventListener('click', () => this.startRecording());
    stopBtn.addEventListener('click', () => this.stopRecording());

    // Quick settings
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const showOriginal = document.getElementById('showOriginal');
    const showTranslation = document.getElementById('showTranslation');

    sourceLanguage.addEventListener('change', (e) => {
      this.settings.sourceLanguage = e.target.value;
      this.saveSettings();
    });

    targetLanguage.addEventListener('change', (e) => {
      this.settings.targetLanguage = e.target.value;
      this.saveSettings();
    });

    showOriginal.addEventListener('change', (e) => {
      this.settings.showOriginal = e.target.checked;
      this.saveSettings();
    });

    showTranslation.addEventListener('change', (e) => {
      this.settings.showTranslation = e.target.checked;
      this.saveSettings();
    });

    // Settings link
    const settingsLink = document.getElementById('settingsLink');
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  updateUI() {
    // Update toggle
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.classList.toggle('active', this.settings.enabled);

    // Update form values
    document.getElementById('sourceLanguage').value = this.settings.sourceLanguage;
    document.getElementById('targetLanguage').value = this.settings.targetLanguage;
    document.getElementById('showOriginal').checked = this.settings.showOriginal;
    document.getElementById('showTranslation').checked = this.settings.showTranslation;

    // Update recording controls
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');

    if (!this.settings.enabled) {
      startBtn.disabled = true;
      stopBtn.disabled = true;
      status.textContent = 'Enable extension to start recording';
      status.className = 'status inactive';
    } else if (!this.settings.apiKeys?.lemonfox || !this.settings.apiKeys?.openai) {
      startBtn.disabled = true;
      stopBtn.disabled = true;
      status.textContent = 'Configure API keys in settings';
      status.className = 'status inactive';
    } else if (this.isRecording) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      status.textContent = 'Recording... Speak now';
      status.className = 'status recording';
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      status.textContent = 'Ready to record';
      status.className = 'status ready';
    }
  }

  async saveSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: this.settings
      }, (response) => {
        resolve(response);
      });
    });
  }

  async startRecording() {
    if (!this.currentTab?.id) {
      this.showError('No active tab found');
      return;
    }

    try {
      // Send message to content script
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'startRecording'
      });

      if (response.success) {
        this.isRecording = true;
        this.updateUI();
      } else {
        this.showError('Failed to start recording');
      }
    } catch (error) {
      this.showError('Content script not loaded. Please refresh the page.');
    }
  }

  async stopRecording() {
    if (!this.currentTab?.id) {
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'stopRecording'
      });

      if (response.success) {
        this.isRecording = false;
        this.updateUI();
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecording = false;
      this.updateUI();
    }
  }

  showError(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status recording'; // Red styling
    
    setTimeout(() => {
      this.updateUI();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ShiftSpeakPopup();
});