# VoiceNotion

VoiceNotion is a voice-enabled note-taking application built with Expo and React Native. It allows users to create and edit notes using voice commands through a powerful block-based editor.

## Features

- Voice-to-text input for quick note creation
- Block-based editor powered by BlockNote.js
- Support for various content blocks (text, headings, lists, etc.)
- Mobile-first design with intuitive UI
- User authentication with Supabase
- Cloud synchronization of notes across devices
- Offline support with local storage

## Project Structure

- `/app`: Expo Router screens and navigation
- `/components`: Reusable UI components
- `/services`: API calls and business logic
- `/hooks`: Custom React hooks
- `/utils`: Helper functions and utilities
- `/models`: Data models and type definitions
- `/contexts`: React context providers

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up Supabase:
   - Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to create a Supabase project
   - Create a `.env` file with your Supabase credentials:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
4. Start the development server:
   ```
   npm start
   ```
5. Run on iOS or Android:
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
- BlockNote.js for rich text editing (via Expo DOM Components)
- Zustand for state management
- Supabase for authentication and data storage

## Authentication & Data Sync

VoiceNotion uses Supabase for user authentication and data synchronization:

- **Authentication**: Email/password authentication with secure token storage
- **Note Storage**: Notes are stored in Supabase PostgreSQL database with real-time capabilities
- **Offline Support**: Notes are cached locally and synced when online
- **Sync Status**: Visual indicators show sync status in the app

For detailed setup instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Current Status

This project now includes:

- Complete app structure with bottom tab navigation
- BlockNote editor integration
- Voice input functionality
- User authentication (login, signup, password reset)
- Note synchronization with Supabase
- Offline support

## Voice Command Content Editing

VoiceNotion supports editing content through voice commands, which enables users to format text, select content, replace text, modify blocks, and perform undo/redo operations using their voice.

### Available Voice Commands

The following voice command types are available:

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

## Next Steps

- Add support for additional authentication providers
- Implement real-time collaboration features
- Enhance synchronization with conflict resolution
- Add custom templates and themes
- Improve accessibility features

## License

MIT
