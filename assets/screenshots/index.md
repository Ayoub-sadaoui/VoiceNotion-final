# sayNote App Screenshots Documentation

This documentation provides a comprehensive visual reference for all screens in the sayNote app, along with detailed descriptions of their functionality, UI elements, and user interactions.

## Table of Contents

### [Main Tab Screens](./main-tabs/documentation.md)

- [Home Screen](./main-tabs/documentation.md#home-screen)
- [Search Screen](./main-tabs/documentation.md#search-screen)
- [Profile Screen](./main-tabs/documentation.md#profile-screen)

### [Authentication Screens](./auth/documentation.md)

- [Login Screen](./auth/documentation.md#login-screen)
- [Signup Screen](./auth/documentation.md#signup-screen)
- [Forgot Password Screen](./auth/documentation.md#forgot-password-screen)
- [Auth Callback Screen](./auth/documentation.md#auth-callback-screen)

### [Note Screens](./note/documentation.md)

- [Note Detail Screen - Empty](./note/documentation.md#note-detail-screen---empty)
- [Note Detail Screen - With Content](./note/documentation.md#note-detail-screen---with-content)
- [Note Detail Screen - With Voice Recording](./note/documentation.md#note-detail-screen---with-voice-recording-active)

### [Profile Sub-screens](./profile/documentation.md)

- [Edit Profile Screen](./profile/documentation.md#edit-profile-screen)
- [Voice Commands Screen](./profile/documentation.md#voice-commands-screen)
- [Help Screen](./profile/documentation.md#help-screen)
- [Backup Screen](./profile/documentation.md#backup-screen)
- [About Screen](./profile/documentation.md#about-screen)

### [Modal Components](./modals/documentation.md)

- [Icon Picker Modal](./modals/documentation.md#icon-picker-modal)
- [Confirm Dialog Modal](./modals/documentation.md#confirm-dialog-modal)

## Key UI Components

Throughout the app, several reusable UI components appear across multiple screens:

1. **Floating Tab Bar**: Custom navigation bar at the bottom of the screen with Home, Search, and Profile tabs
2. **Voice Command Button**: Floating action button for activating voice input
3. **Page Header**: Contains title, back button, and action buttons for screens
4. **Block Editor**: The main content editing interface based on BlockNote.js
5. **Theme Toggle**: Switch between light and dark mode themes

## User Flow Diagrams

For a visual representation of how users navigate between screens, refer to the following flow diagrams:

1. **Authentication Flow**: Login → Home or Signup → Home
2. **Note Creation Flow**: Home → Note Detail → Voice Input → Edited Note
3. **Search Flow**: Search → Results → Note Detail
4. **Settings Flow**: Profile → Various Settings Screens

## Screenshots Collection Process

These screenshots were captured on [device/simulator] running [iOS/Android version] to provide a consistent visual reference for the app's interface. Both light and dark theme variants are included where relevant.

## Using This Documentation

This documentation is intended for:

- Developers working on the sayNote app
- Designers creating new features or UI improvements
- Technical writers creating user documentation
- QA testers verifying UI implementation

For additional technical documentation, refer to the project README and code comments.
