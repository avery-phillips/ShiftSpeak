# Building Shift Speak Chrome Extension

This guide explains how to build and package the Shift Speak Chrome extension from the web application codebase.

## Prerequisites

- Node.js 18+ installed
- Chrome browser for testing
- API keys for Lemonfox and OpenAI services

## Build Process

### 1. Copy Shared Modules

```bash
# Create extension build directory
mkdir -p extension/build/shared/core

# Copy core modules
cp shared/core/*.ts extension/build/shared/core/
cp shared/schema.ts extension/build/shared/

# Copy essential components (convert to vanilla JS)
cp client/src/components/CaptionOverlay.tsx extension/build/components/
```

### 2. Bundle JavaScript Files

Since Chrome extensions can't directly use TypeScript, you'll need to bundle the files:

```bash
# Install build dependencies
npm install --save-dev webpack webpack-cli typescript ts-loader

# Create webpack config (webpack.config.js)
# Bundle background.js, content.js, popup.js
```

### 3. Prepare Extension Files

The extension directory already contains:
- `manifest.json` - Extension configuration
- `background.js` - Service worker
- `content.js` - Content script for web pages
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality
- `content.css` - Styling for captions

### 4. Add Icons

Create icon files in `extension/icons/`:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px) 
- `icon128.png` (128x128px)

### 5. Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension` folder
5. The extension should now appear in Chrome

## Configuration

### API Keys
Users need to configure API keys through the extension popup:
1. Click the extension icon in Chrome toolbar
2. Click "Advanced Settings & API Keys"
3. Enter Lemonfox API key for transcription
4. Enter OpenAI API key for translation

### Permissions
The extension requests these permissions:
- `activeTab` - Access current tab for content injection
- `storage` - Store user settings and API keys
- `scripting` - Inject content scripts
- `<all_urls>` - Work on any website

## Development Workflow

1. **Web App First**: Develop and test features in the web application
2. **Extract Core Logic**: Move reusable logic to `shared/core/` modules  
3. **Adapt for Extension**: Create extension-specific UI and manifest
4. **Test Extension**: Load unpacked extension and test on various websites
5. **Package for Distribution**: Create ZIP file for Chrome Web Store

## Architecture Benefits

This modular approach provides:
- **Code Reusability**: Core transcription/translation logic shared between web app and extension
- **Maintainability**: Single source of truth for business logic
- **Testability**: Test features in web app before extension integration
- **Scalability**: Easy to add new platforms (Firefox, Safari extensions)

## Future Enhancements

- Auto-detect video elements on pages
- Custom caption styling per website
- Keyboard shortcuts for quick controls
- Export transcripts to external services
- Multi-language interface support