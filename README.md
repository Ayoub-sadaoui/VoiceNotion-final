# VoiceNotion

VoiceNotion is a voice-enabled note-taking application built with Expo and React Native. It allows users to create and edit notes using voice commands through a powerful block-based editor.

## Features

- Voice-to-text input for quick note creation
- Block-based editor powered by BlockNote.js
- Support for various content blocks (text, headings, lists, etc.)
- Mobile-first design with intuitive UI

## Project Structure

- `/app`: Expo Router screens and navigation
- `/components`: Reusable UI components
- `/services`: API calls and business logic
- `/hooks`: Custom React hooks
- `/utils`: Helper functions and utilities
- `/editor-web-content`: HTML content for the BlockNote editor WebView

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Run on iOS or Android:
   ```
   npm run ios
   ```
   or
   ```
   npm run android
   ```

## Technology Stack

- Expo SDK 53+
- React Native
- Expo Router for navigation
- BlockNote.js for rich text editing (via WebView)
- Zustand for state management

## Current Status

This is an early prototype with the following implemented features:

- Basic app structure with bottom tab navigation
- BlockNote editor integration via WebView
- Mock voice input functionality

## Next Steps

- Implement real voice recording using device microphone
- Integrate with Gemini API for voice intent parsing
- Add support for more block types and formatting options
- Implement note saving and organization

## License

MIT
