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

## Voice Command Content Editing

VoiceNotion now supports editing content through voice commands, which enables users to format text, select content, replace text, modify blocks, and perform undo/redo operations using their voice.

### Available Voice Commands

The following voice command types are now available:

1. **Text Formatting Commands**

   - "Make the last paragraph bold"
   - "Make the first heading italic"
   - "Underline the text that says project timeline"
   - "Remove formatting from the selected text"

2. **Text Selection Commands**

   - "Select the last paragraph"
   - "Select the text that says project timeline"
   - "Select from 'project timeline' to 'next steps'"
   - "Select all headings"

3. **Content Modification Commands**

   - "Change the heading 'Ingredients' to 'Required Ingredients'"
   - "Replace 'customer feedback' with 'client comments'"
   - "Delete everything after 'next steps'"

4. **Block Transformation Commands**

   - "Convert the paragraph about timeline to a bulleted list"
   - "Change the first heading to heading level 2"
   - "Make this paragraph a quote block"

5. **Undo/Redo Commands**
   - "Undo last change"
   - "Redo"
   - "Undo the last two changes"

### Usage

To use voice commands for editing:

1. Tap the microphone button to start recording
2. Say your command clearly
3. Wait for the command to be processed
4. Check the feedback toast notification for the result

See the full list of voice commands in [VOICE_COMMANDS.md](./VOICE_COMMANDS.md).

### Implementation Notes

Voice command editing uses the following components:

- Gemini API for natural language parsing and intent extraction
- WebView communication between React Native and BlockNote editor
- TranscriptionHandler for executing editor commands
- Direct storage updates to ensure persistence

## License

MIT
