import { validateBlockFormat, createBlock, findBlocksByType, findBlockById, extractTextFromBlock, extractAllText, cleanInvalidPageLinks } from '../blockOperations';

const mockBlocks = [
  { id: '1', type: 'heading', content: [{ type: 'text', text: 'Heading 1' }], props: { level: 1 }, children: [] },
  { id: '2', type: 'paragraph', content: [{ type: 'text', text: 'Some text.' }], props: {}, children: [] },
  { id: '3', type: 'pageLink', props: { pageId: 'validPage1' }, content: [], children: [] },
  { id: '4', type: 'pageLink', props: { pageId: 'invalidPage' }, content: [], children: [] },
];

describe('blockOperations', () => {
  describe('validateBlockFormat', () => {
    it('should return true for a valid block', () => {
      expect(validateBlockFormat(mockBlocks[0])).toBe(true);
    });

    it('should return false for an invalid block', () => {
      expect(validateBlockFormat({ content: [] })).toBe(false); // Missing type
    });
  });

  describe('createBlock', () => {
    it('should create a new block with the correct structure', () => {
      const newBlock = createBlock('paragraph', 'Hello world');
      expect(newBlock.type).toBe('paragraph');
      expect(newBlock.content[0].text).toBe('Hello world');
    });
  });

  describe('findBlocksByType', () => {
    it('should find all blocks of a given type', () => {
      const pageLinks = findBlocksByType(mockBlocks, 'pageLink');
      expect(pageLinks).toHaveLength(2);
    });
  });

  describe('findBlockById', () => {
    it('should find a block by its ID', () => {
      const block = findBlockById(mockBlocks, '2');
      expect(block.type).toBe('paragraph');
    });

    it('should return null if block not found', () => {
      const block = findBlockById(mockBlocks, '99');
      expect(block).toBeNull();
    });
  });

  describe('extractTextFromBlock', () => {
    it('should extract text from a block', () => {
      const text = extractTextFromBlock(mockBlocks[0]);
      expect(text).toBe('Heading 1');
    });
  });

  describe('extractAllText', () => {
    it('should extract all text from an array of blocks', () => {
      const text = extractAllText(mockBlocks);
      expect(text).toBe('Heading 1\nSome text.\n\n');
    });
  });

  describe('cleanInvalidPageLinks', () => {
    it('should remove pageLinks with invalid pageIds', () => {
      const validPageIds = ['validPage1'];
      const cleanedBlocks = cleanInvalidPageLinks(mockBlocks, validPageIds);
      expect(cleanedBlocks).toHaveLength(3);
      expect(findBlockById(cleanedBlocks, '4')).toBeNull();
    });
  });
});
