# Shift Speak Chrome Extension Development Guide

## Overview

This guide explains how the Shift Speak web application has been structured for easy Chrome extension development. The modular architecture allows you to reuse core functionality between the web app and browser extension.

## Project Structure

```
shift-speak/
├── client/src/                 # Web application frontend
├── server/                     # Web application backend  
├── shared/                     # Shared types and schemas
├── shared/core/               # Platform-agnostic core modules ⭐
├── extension/                 # Chrome extension files ⭐
└── replit.md                 # Project documentation
```

## Core Modules (Reusable Between Platforms)

### `shared/core/TranscriptionManager.ts`
- Handles audio-to-text conversion using Lemonfox API
- Platform-independent transcription logic
- Used by both web app and extension

### `shared/core/TranslationManager.ts`  
- Manages text translation using OpenAI API
- Supports multiple target languages
- Shared between web and extension contexts

### `shared/core/AudioCapture.ts`
- Cross-platform audio recording utilities
- Handles microphone access and audio streaming
- Works in both browser and extension environments

### `shared/core/CaptionRenderer.ts`
- Universal caption overlay system
- Renders real-time captions on any web page
- Consistent styling and positioning across platforms

## Chrome Extension Components

### `extension/manifest.json`
- Manifest V3 configuration
- Defines permissions, content scripts, and popup
- Specifies extension metadata and capabilities

### `extension/background.js`
- Service worker for background processing
- Handles API calls to Lemonfox and OpenAI
- Manages settings and inter-tab communication

### `extension/content.js`
- Injected into web pages for real-time captions
- Uses core modules for transcription and rendering
- Handles audio capture and caption display

### `extension/popup.html` & `extension/popup.js`
- Extension popup interface for quick controls
- Start/stop recording, language selection
- Settings management and API key configuration

## Development Workflow

### 1. Web App Development
- Build and test features in the web application first
- Use the full development environment with hot reload
- Debug using browser developer tools

### 2. Extract Reusable Logic
- Move platform-independent code to `shared/core/` modules
- Ensure functionality works without React/DOM dependencies
- Create clean interfaces for different platform implementations

### 3. Extension Adaptation
- Use core modules in extension content scripts
- Adapt UI components for Chrome extension context
- Handle extension-specific APIs (storage, messaging, tabs)

### 4. Testing & Deployment
- Load unpacked extension in Chrome for development
- Test on various websites and video platforms
- Package for Chrome Web Store distribution

## Key Benefits

### Code Reusability
- 80%+ of core functionality shared between platforms
- Single source of truth for transcription/translation logic
- Consistent behavior across web app and extension

### Maintainability
- Changes to core features automatically benefit both platforms
- Centralized bug fixes and improvements
- Clear separation of concerns

### Development Efficiency
- Faster development cycle using web app environment
- Easy testing and debugging with full tooling support
- Seamless transition from web to extension

## Getting Started

1. **Set up the web application** (already complete)
   ```bash
   npm run dev  # Start development server
   ```

2. **Test core functionality** in web interface
   - Upload audio files
   - Configure transcription settings
   - Verify caption rendering

3. **Load Chrome extension**
   ```bash
   # Open Chrome > Extensions > Developer Mode > Load Unpacked
   # Select the 'extension' folder
   ```

4. **Configure API keys** in extension popup
   - Lemonfox API key for transcription
   - OpenAI API key for translation

5. **Test on web pages**
   - Navigate to any website
   - Click extension icon and start recording
   - Verify real-time captions appear

## Future Enhancements

- **Multi-browser Support**: Adapt for Firefox and Safari extensions
- **Offline Mode**: Local speech recognition for privacy
- **Custom Models**: Support for specialized transcription models
- **Enterprise Features**: Team settings and usage analytics

The modular architecture makes these enhancements straightforward to implement across all platforms.