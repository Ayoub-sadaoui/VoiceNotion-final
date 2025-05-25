// Sample categories/filters
export const filters = [
  { id: "all", name: "All Notes" },
  { id: "pinned", name: "Pinned" },
  { id: "recent", name: "Recent" },
  { id: "work", name: "Work" },
  { id: "personal", name: "Personal" },
  { id: "ideas", name: "Ideas" },
];

// Sample notes data
export const notes = [
  {
    id: "1",
    title: "Project Ideas",
    content:
      "I saw a cool design on the street that could inspire a web design. Always get inspiration from surroundings! Sometimes looking at the color combinations in nature leads to unique ideas.",
    createdAt: "2023-11-22T10:30:00Z",
    updatedAt: new Date().toISOString(),
    isPinned: true,
    category: "ideas",
    tags: ["design", "inspiration"],
  },
  {
    id: "2",
    title: "Shopping List",
    content: "Espresso coffee (new brand)\nNotebook\nWireless mouse\nGreen tea",
    createdAt: "2023-11-20T14:20:00Z",
    updatedAt: "2023-11-21T09:15:00Z",
    isPinned: false,
    category: "personal",
    tags: ["shopping"],
  },
  {
    id: "3",
    title: "Meeting Notes",
    content:
      "Discussed project timeline with the team. Key points:\n- Launch date: Dec 15\n- Marketing strategy needs revision\n- Budget approved\n- Need to schedule follow-up",
    createdAt: "2023-11-19T16:45:00Z",
    updatedAt: "2023-11-19T18:30:00Z",
    isPinned: true,
    category: "work",
    tags: ["meeting", "project"],
  },
  {
    id: "4",
    title: "Book Recommendations",
    content:
      '1. "Atomic Habits" by James Clear\n2. "Deep Work" by Cal Newport\n3. "The Psychology of Money" by Morgan Housel',
    createdAt: "2023-11-15T20:10:00Z",
    updatedAt: "2023-11-16T10:05:00Z",
    isPinned: false,
    category: "personal",
    tags: ["books", "reading"],
  },
  {
    id: "5",
    title: "Workout Routine",
    content:
      "Monday: Upper body\nTuesday: Lower body\nWednesday: Rest\nThursday: Cardio\nFriday: Full body\nWeekend: Active recovery",
    createdAt: "2023-11-10T08:20:00Z",
    updatedAt: "2023-11-10T08:20:00Z",
    isPinned: false,
    category: "personal",
    tags: ["health", "fitness"],
  },
  {
    id: "6",
    title: "App Feature Ideas",
    content:
      "- Voice command improvements\n- Dark mode toggle\n- Export to PDF\n- Quick note widget\n- Note sharing options\n- Cloud sync integration",
    createdAt: "2023-11-05T15:30:00Z",
    updatedAt: "2023-11-07T11:45:00Z",
    isPinned: false,
    category: "work",
    tags: ["development", "features"],
  },
  {
    id: "7",
    title: "Vacation Planning",
    content:
      "Potential destinations:\n1. Japan - Tokyo, Kyoto\n2. Italy - Rome, Florence, Venice\n3. Costa Rica\n\nBest time to visit: April-May or September-October",
    createdAt: "2023-10-28T19:15:00Z",
    updatedAt: "2023-11-02T20:30:00Z",
    isPinned: false,
    category: "personal",
    tags: ["travel", "planning"],
  },
];

// Sample folders
export const folders = [
  {
    id: "work",
    name: "Work",
    icon: "briefcase-outline",
    color: "#0A84FF",
    count: 2,
  },
  {
    id: "personal",
    name: "Personal",
    icon: "person-outline",
    color: "#30D158",
    count: 4,
  },
  {
    id: "ideas",
    name: "Ideas",
    icon: "bulb-outline",
    color: "#FF9F0A",
    count: 1,
  },
];
