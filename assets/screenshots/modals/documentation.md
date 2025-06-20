# Modal Components

## Icon Picker Modal

![Icon Picker Modal](./icon-picker.png)

### Description

The Icon Picker Modal allows users to select an emoji or icon to represent their note. It provides a searchable interface with categorized emoji options.

### Key UI Elements

- Search Bar: Filter emojis by keyword
- Category Tabs: Organize emojis by category (smileys, objects, etc.)
- Emoji Grid: Visual display of available emojis
- Selected Icon Preview: Shows currently selected emoji
- Confirm/Cancel Buttons: Apply or discard selection

### User Interactions

- Tap emoji: Select it for the note
- Type in search: Filter available emojis
- Tap category: Switch between emoji categories
- Tap outside modal: Cancel selection
- Tap confirm: Apply selected emoji to note

### Navigation

- Appears as overlay on Note Detail Screen
- Returns to Note Detail Screen after selection or cancellation

---

## Confirm Dialog Modal

![Confirm Dialog Modal](./confirm-dialog.png)

### Description

The Confirm Dialog Modal presents important actions that require user confirmation, such as deleting notes or discarding changes. It prevents accidental actions by requiring explicit confirmation.

### Key UI Elements

- Title: Describes the action requiring confirmation
- Message: Explains consequences of the action
- Confirm Button: Proceeds with the action
- Cancel Button: Dismisses the dialog without action
- Optional Icon: Visual indicator of action type

### User Interactions

- Tap confirm: Proceeds with the action (delete, discard, etc.)
- Tap cancel: Dismisses the dialog without taking action
- Tap outside modal: Usually cancels the action (same as Cancel)

### Navigation

- Appears as overlay on various screens
- Returns to originating screen after confirmation or cancellation
