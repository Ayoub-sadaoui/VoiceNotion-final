import { createSelectionCommand, createFormattingCommand, createBlockModificationCommand, createReplaceTextCommand, createUndoCommand, createRedoCommand, findTextInBlocks, findBlocksByPosition } from '../editorCommands';

const mockBlocks = [
  { id: '1', type: 'heading', content: [{ type: 'text', text: 'First Heading' }], children: [] },
  { id: '2', type: 'paragraph', content: [{ type: 'text', text: 'Some text here.' }], children: [] },
  { id: '3', type: 'paragraph', content: [{ type: 'text', text: 'More text.' }], children: [] },
  { id: '4', type: 'heading', content: [{ type: 'text', text: 'Second Heading' }], children: [] },
];

describe('editorCommands', () => {
  describe('Command Creators', () => {
    it('should create a valid selection command', () => {
      const command = createSelectionCommand('TEXT', { text: 'some text' });
      expect(command).toEqual({ type: 'SELECTION', selectionType: 'TEXT', text: 'some text' });
    });

    it('should create a valid formatting command', () => {
      const command = createFormattingCommand('bold');
      expect(command).toEqual({ type: 'FORMATTING', formatType: 'bold' });
    });

    it('should create a valid block modification command', () => {
      const command = createBlockModificationCommand('CHANGE_TYPE', { to: 'paragraph' });
      expect(command).toEqual({ type: 'BLOCK_MODIFICATION', modificationType: 'CHANGE_TYPE', to: 'paragraph' });
    });

    it('should create a valid replace text command', () => {
      const command = createReplaceTextCommand('find', 'replace');
      expect(command).toEqual({ type: 'REPLACE_TEXT', findText: 'find', replaceWith: 'replace' });
    });

    it('should create a valid undo command', () => {
      const command = createUndoCommand(2);
      expect(command).toEqual({ type: 'UNDO', steps: 2 });
    });

    it('should create a valid redo command', () => {
      const command = createRedoCommand();
      expect(command).toEqual({ type: 'REDO', steps: 1 });
    });
  });

  describe('findTextInBlocks', () => {
    it('should find text within blocks, case-insensitively', () => {
      const matches = findTextInBlocks(mockBlocks, 'heading');
      expect(matches).toHaveLength(2);
      expect(matches[0].blockId).toBe('1');
      expect(matches[1].blockId).toBe('4');
    });

    it('should return an empty array if no text is found', () => {
      const matches = findTextInBlocks(mockBlocks, 'nonexistent');
      expect(matches).toHaveLength(0);
    });
  });

  describe('findBlocksByPosition', () => {
    it('should find the first block', () => {
      const ids = findBlocksByPosition(mockBlocks, 'first');
      expect(ids).toEqual(['1']);
    });

    it('should find the last block of a specific type', () => {
      const ids = findBlocksByPosition(mockBlocks, 'last', 'paragraph');
      expect(ids).toEqual(['3']);
    });

    it('should find all blocks of a specific type', () => {
      const ids = findBlocksByPosition(mockBlocks, 'all', 'heading');
      expect(ids).toEqual(['1', '4']);
    });

    it('should find a block by numerical position', () => {
      const ids = findBlocksByPosition(mockBlocks, '2nd', 'paragraph');
      expect(ids).toEqual(['3']);
    });
  });
});
