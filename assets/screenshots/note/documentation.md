# Note Screens

## Note Detail Screen - Empty

![Note Detail Screen - Empty](./note-detail-empty.png)

### Description

The Note Detail Screen in its empty state shows a blank canvas ready for content creation. It displays the basic structure of the note editor with an empty content area.

### Key UI Elements

- Page Header: Contains title field, back button, and action buttons
- Empty Editor Area: The main content area where blocks will be added
- Voice Command Button: Floating action button for voice input
- Block Type Menu: Options for different content block types

### User Interactions

- Tap title field: Edit the note title
- Tap editor area: Begin typing content
- Tap voice command button: Start voice input
- Tap back button: Return to previous screen

### Navigation

- Accessible from Home Screen or Search Screen
- Back button returns to the previous screen

---

## Note Detail Screen - With Content

![Note Detail Screen - With Content](./note-detail-content.png)

### Description

The Note Detail Screen with content shows an active note with various block types and formatting. This is the main interface for viewing and editing notes.

### Key UI Elements

- Page Header: Contains title, back button, undo/redo buttons
- Content Blocks: Various block types (text, headings, lists, etc.)
- Block Handles: UI elements for manipulating blocks
- Formatting Toolbar: Appears when text is selected
- Voice Command Button: For voice input

### User Interactions

- Tap on blocks: Edit existing content
- Long press on blocks: Show block options menu
- Select text: Show formatting options
- Drag block handles: Reorder or nest blocks
- Tap "+" button: Insert new block
- Tap voice command button: Start voice input

### Navigation

- Accessible from Home Screen, Search Results, or other notes via links
- Back button returns to previous screen

---

## Note Detail Screen - With Voice Recording Active

![Note Detail Screen - With Voice Recording](./note-detail-voice.png)

### Description

This screen shows the Note Detail Screen with the voice recording interface active. It displays the voice input UI overlay and transcription feedback.

### Key UI Elements

- Voice Recording Indicator: Shows that voice input is active
- Transcription Display: Shows real-time transcription of speech
- Cancel Button: Stops voice recording without applying changes
- Submit Button: Applies transcribed content to the note
- Listening Animation: Visual feedback for voice detection

### User Interactions

- Speak: Voice is transcribed and displayed
- Tap cancel: Discard transcription and return to editor
- Tap submit: Apply transcribed content to the note
- Voice commands: Special phrases trigger specific editor actions

### Navigation

- Returns to normal Note Detail Screen after voice input is completed or canceled
