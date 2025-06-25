import axios from "axios";
import { processCommandWithGemini } from "../geminiService";

// Mock axios to control API responses
jest.mock("axios");

// Mock expo-av to prevent native module errors
jest.mock("expo-av", () => ({
  Audio: {
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn(),
      startAsync: jest.fn(),
      stopAndUnloadAsync: jest.fn(),
      getURI: jest.fn(() => "file:///mock/path"),
    })),
    Sound: {
      createAsync: jest.fn(),
    },
    setAudioModeAsync: jest.fn(),
  },
}));

describe("geminiService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("processCommandWithGemini", () => {
    it("should return a valid command from the API", async () => {
      const mockApiResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '```json\n{"action":"CREATE_NOTE","title":"New Note"}\n```',
                  },
                ],
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockApiResponse);

      const result = await processCommandWithGemini(
        "create a new note called New Note",
        []
      );
      expect(result).toMatchObject({
        action: "CREATE_NOTE",
        title: "New Note",
      });
    });

    it("should fall back to INSERT_CONTENT for malformed JSON", async () => {
      const mockApiResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"action":"CREATE_NOTE",...\n```' }],
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockApiResponse);

      const result = await processCommandWithGemini("some text", []);
      expect(result).toEqual({
        success: true,
        action: "INSERT_CONTENT",
        content: "some text",
        rawCommand: "some text",
      });
    });

    it("should fall back to INSERT_CONTENT on API error", async () => {
      axios.post.mockRejectedValue(new Error("API Error"));

      const result = await processCommandWithGemini("some text", []);
      expect(result).toEqual({
        success: true,
        action: "INSERT_CONTENT",
        content: "some text",
        rawCommand: "some text",
      });
    });

    it("should delete the last block when asked", async () => {
      const mockEditorContent = [
        {
          id: "block1",
          type: "paragraph",
          content: [{ type: "text", text: "First block" }],
          props: {},
          children: [],
        },
        {
          id: "block2",
          type: "heading",
          content: [{ type: "text", text: "Second block" }],
          props: { level: 1 },
          children: [],
        },
        {
          id: "block3",
          type: "paragraph",
          content: [{ type: "text", text: "Last block" }],
          props: {},
          children: [],
        },
      ];
      const result = await processCommandWithGemini(
        "delete the last block",
        mockEditorContent
      );
      expect(result).toMatchObject({
        success: true,
        action: "DELETE_BLOCK",
        targetBlockIds: ["block3"],
      });
    });

    it("should delete the first heading when asked", async () => {
      const mockEditorContent = [
        {
          id: "block1",
          type: "paragraph",
          content: [{ type: "text", text: "Intro" }],
          props: {},
          children: [],
        },
        {
          id: "block2",
          type: "heading",
          content: [{ type: "text", text: "First heading" }],
          props: { level: 1 },
          children: [],
        },
        {
          id: "block3",
          type: "heading",
          content: [{ type: "text", text: "Second heading" }],
          props: { level: 2 },
          children: [],
        },
      ];
      const result = await processCommandWithGemini(
        "delete the first heading",
        mockEditorContent
      );
      expect(result).toMatchObject({
        success: true,
        action: "DELETE_BLOCK",
        targetBlockIds: ["block2"],
      });
    });

    it("should clarify if no matching block is found", async () => {
      const mockEditorContent = [
        {
          id: "block1",
          type: "paragraph",
          content: [{ type: "text", text: "Only block" }],
          props: {},
          children: [],
        },
      ];
      const result = await processCommandWithGemini(
        "delete the last heading",
        mockEditorContent
      );
      expect(result).toMatchObject({
        success: false,
        action: "CLARIFICATION",
      });
    });
  });
});
