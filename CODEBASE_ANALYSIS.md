# VoiceNotion: Comprehensive Project Documentation

## 1. Business Model Canvas

This section outlines the business model for VoiceNotion, providing a strategic overview of the application's value proposition, customer segments, and revenue streams.

| Category                | Description                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Value Propositions**  | Voice-first note-taking, seamless cross-device sync, powerful block-based editor, offline access, and intuitive UI.                        |
| **Customer Segments**   | Students, professionals, writers, and anyone who needs a quick and efficient way to capture and organize their thoughts.                   |
| **Channels**            | App Store, Google Play Store, official website, and social media marketing.                                                              |
| **Customer Relationships**| In-app support, community forums, and regular updates with new features and improvements.                                                |
| **Revenue Streams**     | Freemium model with a free tier and a premium subscription for advanced features like unlimited voice commands, and additional storage.     |
| **Key Activities**      | App development, marketing, customer support, and maintaining the backend infrastructure.                                                 |
| **Key Resources**       | Development team, backend infrastructure (Supabase), and marketing budget.                                                               |
| **Key Partners**        | Supabase for backend services, and potentially other technology providers for voice recognition or AI-powered features.                |
| **Cost Structure**      | Development costs, marketing expenses, and subscription fees for backend services.                                                       |

## 2. Core Features & Functionalities

This section provides a detailed breakdown of VoiceNotion's key features.

### Note Management

- **Hierarchical Structure:** Notes can be organized in a tree-like structure, with sub-pages nested under parent pages.
- **Recent Pages:** A dedicated section on the home screen displays recently accessed notes for quick access.
- **CRUD Operations:** Users can create, read, update, and delete notes.
- **Swipe-to-Delete:** A convenient swipe gesture allows for quick deletion of notes.

### Rich Text Editor

- **Block-Based:** The editor is powered by BlockNote.js, which provides a structured, block-based editing experience.
- **Variety of Blocks:** Supports various content blocks, including headings, paragraphs, lists, and more.
- **Icon Picker:** Users can assign a unique icon to each note for better visual organization.

### Voice Commands

- **Voice-to-Text:** Users can dictate their notes, and the app will convert their speech to text.
- **Editing Commands:** A range of voice commands are available for editing, including text formatting, selection, and modification.

### Search Functionality

- **Full-Text Search:** Users can search for notes by title and content.
- **Filtering:** Search results can be filtered to show all matches, or only matches in the title or content.
- **Recent Searches:** The app keeps a list of recent search queries for quick reuse.

### User Authentication

- **Provider:** Supabase
- **Method:** Secure email and password authentication.
- **Profile Management:** Users can edit their profile information, including their name and avatar.

### Real-time Data Sync

- **Provider:** Supabase Realtime
- **Functionality:** Notes are automatically synced across all connected devices in real-time.

### Offline Support

- **Local Caching:** Notes are cached locally, allowing users to access and edit them even without an internet connection.

### Theming

- **Light & Dark Modes:** The app supports both light and dark themes, which can be toggled in the profile settings.

## 3. Application Architecture

This section provides an overview of the application's technical design.

- **Project Structure:** The project follows a standard React Native structure, with a clear separation of concerns.
- **Navigation:** Expo Router is used for both tab-based and stack navigation.
- **State Management:** Zustand and React Context are used for managing global and local state.
- **Data Flow:** Data is fetched from Supabase, cached locally, and then displayed to the user.
- **Custom Hooks:** Several custom hooks are used to encapsulate complex logic, such as `usePageStorage` and `useRealtimeNotes`.

## 4. Technology & Tools Deep Dive

- **Expo:** The core framework for building the application.
- **React Native:** The UI library for building the user interface.
- **Supabase:** Provides all backend services, including authentication, database, and real-time sync.
- **BlockNote.js:** The rich text editor library.
- **Expo Router:** Handles all navigation within the app.
- **Zustand:** A lightweight state management library.

## 5. Screen Flow & UI Components

- **Home Screen:** The main dashboard, displaying a list of notes and recent pages.
- **Editor Screen:** The screen for creating and editing notes.
- **Profile Screen:** The user's account management hub.
- **Search Screen:** The screen for searching through notes.

## 6. Setup & Deployment

- **Prerequisites:** Node.js, npm, and the Expo CLI.
- **Installation:** `npm install`
- **Configuration:** Create a `.env` file with your Supabase URL and anon key.
- **Running the App:** `npm start`
