// Background service worker for Shift Speak Chrome Extension
// Handles API key storage, background processing, and inter-tab communication

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Shift Speak extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    shiftSpeakSettings: {
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
    }
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getSettings':
      chrome.storage.sync.get('shiftSpeakSettings', (data) => {
        sendResponse(data.shiftSpeakSettings || {});
      });
      return true; // Keep message channel open for async response

    case 'updateSettings':
      chrome.storage.sync.set({
        shiftSpeakSettings: request.settings
      }, () => {
        sendResponse({ success: true });
        
        // Notify all content scripts of settings change
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'settingsUpdated',
                settings: request.settings
              }).catch(() => {
                // Ignore errors for tabs without content script
              });
            }
          });
        });
      });
      return true;

    case 'transcribeAudio':
      handleTranscription(request.audioData, request.settings)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'translateText':
      handleTranslation(request.text, request.settings)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Handle transcription requests
async function handleTranscription(audioData, settings) {
  if (!settings.apiKeys?.lemonfox) {
    throw new Error('Lemonfox API key not configured');
  }

  const formData = new FormData();
  const audioBlob = new Blob([audioData], { type: 'audio/webm' });
  formData.append('file', audioBlob);
  formData.append('model', 'whisper-1');
  formData.append('language', settings.sourceLanguage === 'auto' ? undefined : settings.sourceLanguage);

  const response = await fetch('https://api.lemonfox.ai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKeys.lemonfox}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    originalText: result.text,
    timestamp: Date.now(),
    confidence: result.confidence,
    speakerLabel: settings.speakerLabels ? result.speaker : undefined
  };
}

// Handle translation requests
async function handleTranslation(text, settings) {
  if (!settings.apiKeys?.openai) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKeys.openai}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `Translate the following text to ${settings.targetLanguage}. Return only the translation without any additional text: "${text}"`
      }],
      max_tokens: 500,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    translatedText: result.choices[0].message.content.trim()
  };
}

// Clean up when extension is disabled/removed
chrome.runtime.onSuspend.addListener(() => {
  console.log('Shift Speak extension suspended');
});