# Shift Speak Chrome Extension

This directory contains the Chrome extension version of Shift Speak, built using the modular components from the web application.

## Structure

- `manifest.json` - Extension manifest
- `background.js` - Service worker for background tasks
- `content.js` - Content script injected into web pages
- `popup.html/js` - Extension popup interface
- `shared/` - Shared modules from the web app
- `components/` - Reusable UI components

## Development

The extension reuses core functionality from the web application:
- Transcription services (`../server/services/transcriptionService.ts`)
- Translation services (`../server/services/translationService.ts`)
- UI components (`../client/src/components/`)
- Shared schemas (`../shared/schema.ts`)

## Building

1. Copy shared modules to extension directory
2. Bundle with webpack or similar
3. Load unpacked extension in Chrome