import { sanitizeContentBlocks, createDefaultContent } from '../contentUtils';

describe('contentUtils', () => {
  describe('createDefaultContent', () => {
    it('should create a default content block with the correct title', () => {
      const title = 'My Test Note';
      const content = createDefaultContent(title);
      expect(content).toHaveLength(2);
      expect(content[0].type).toBe('heading');
      expect(content[0].content[0].text).toBe(title);
    });
  });

  describe('sanitizeContentBlocks', () => {
    it('should return default content for null or invalid input', () => {
      const defaultContent = createDefaultContent('New note');
      expect(sanitizeContentBlocks(null)).toEqual(defaultContent);
      expect(sanitizeContentBlocks(undefined)).toEqual(defaultContent);
      expect(sanitizeContentBlocks([])).toEqual(defaultContent);
      expect(sanitizeContentBlocks({})).toEqual(defaultContent);
    });

    it('should handle malformed pageLink blocks', () => {
      const malformedContent = [
        {
          type: 'pageLink',
          props: { pageTitle: 'A Linked Page' }, // Missing pageId
          content: [],
          children: [],
        },
      ];
      const sanitized = sanitizeContentBlocks(malformedContent);
      expect(sanitized[0].props.pageId).toBeDefined();
      expect(sanitized[0].props.pageIcon).toBe('📄');
    });

    it('should ensure all blocks have a type', () => {
      const content = [{}];
      const sanitized = sanitizeContentBlocks(content);
      expect(sanitized[0].type).toBe('paragraph');
    });

    it('should not modify valid content', () => {
      const validContent = createDefaultContent('Valid Title');
      const sanitized = sanitizeContentBlocks(JSON.parse(JSON.stringify(validContent)));
      expect(sanitized).toEqual(validContent);
    });
  });
});
