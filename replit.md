# Overview

**Shift Speak** is a comprehensive real-time speech-to-text transcription and translation web application designed for accessibility. Built with Express.js, React, and TypeScript, the application provides live audio transcription using the Lemonfox API and translation capabilities through OpenAI's GPT-4o model. It features a modern interface built with shadcn/ui components and supports multiple languages for both source audio and target translations.

The application serves as both a standalone web platform and a foundation for future browser extension development, making online content accessible through real-time captions and translations.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes (January 2025)

## Tab Audio Capture Implementation ✅
- **Date**: January 5, 2025
- **Achievement**: Successfully implemented Chrome's getDisplayMedia() API for tab audio capture
- **Features Added**:
  - UI controls to switch between microphone and tab audio modes
  - Clear instructions for each capture mode
  - Better button labeling ("Start/Stop Transcription" with "Actively Listening..." feedback)
  - Audio level monitoring for tab streams
  - Error handling for muted or silent tabs
- **Status**: Core functionality complete, debugging audio data processing
- **Next**: Resolve MediaRecorder empty audio data issue for tab streams

# System Architecture

## Frontend Architecture
The client uses React with TypeScript and Vite as the build tool. The UI is built using shadcn/ui components with Radix UI primitives and styled with Tailwind CSS. State management is handled through React Query for server state and local React state for UI interactions. The app uses Wouter for routing and includes components for audio uploading, video playbook, caption overlays, transcript panels, and settings management.

## Backend Architecture
The server is an Express.js application with TypeScript that provides RESTful APIs and WebSocket connections for real-time transcription. It uses a layered architecture with separate service classes for transcription (LemonfoxTranscriptionService) and translation (OpenAITranslationService). The storage layer is abstracted through an IStorage interface with a memory-based implementation for development.

## Chrome Extension Architecture (January 2025)
**Modular Design for Future Extension Development:**

### Core Shared Modules (`shared/core/`)
- **TranscriptionManager.ts**: Platform-agnostic transcription logic
- **TranslationManager.ts**: Reusable translation functionality  
- **AudioCapture.ts**: Cross-platform audio recording utilities
- **CaptionRenderer.ts**: Universal caption overlay system

### Extension Structure (`extension/`)
- **manifest.json**: Chrome extension configuration (Manifest V3)
- **background.js**: Service worker for API calls and settings management
- **content.js**: Content script injected into web pages for real-time captions
- **popup.html/js**: Extension popup interface for quick controls
- **content.css**: Styling for caption overlays on web pages

### Reusable Components
The extension reuses core components from the web application:
- Transcription services (`server/services/`)
- UI components (`client/src/components/`) 
- Shared type definitions (`shared/schema.ts`)

This modular architecture allows seamless transition from web app to Chrome extension while maintaining code reusability and consistent functionality across platforms.

## Database Design
Uses Drizzle ORM with PostgreSQL (configured for Neon Database) with the following schema:
- Users table for authentication
- Transcription sessions for managing recording sessions
- Transcription entries for storing individual transcript segments
- User settings for storing preferences as JSONB

## API Structure
RESTful endpoints for:
- Session management (CRUD operations)
- User settings management
- Audio file uploads with multer
- WebSocket connections for real-time transcription streaming

## Real-time Communication
Implements WebSocket connections for live transcription updates, allowing real-time caption display and transcript streaming between client and server.

# External Dependencies

## Core Services
- **Lemonfox API**: Primary transcription service for converting audio to text with speaker identification
- **OpenAI GPT-4**: Translation service for converting transcribed text between languages
- **Neon Database**: PostgreSQL hosting for production data storage

## File Storage
- **Google Cloud Storage**: For handling audio/video file uploads and storage
- **Uppy**: Client-side file upload handling with drag-and-drop support

## UI Framework
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Build tool and development server
- **Drizzle Kit**: Database migrations and schema management
- **React Query**: Server state management and caching
- **Zod**: Runtime type validation for API requests