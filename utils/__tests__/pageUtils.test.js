import { buildPageTree, getPagePath, findRootAncestor } from '../pageUtils';

const mockPages = [
  { id: '1', parentId: null, title: 'Page 1' },
  { id: '2', parentId: '1', title: 'Page 1.1' },
  { id: '3', parentId: '1', title: 'Page 1.2' },
  { id: '4', parentId: '2', title: 'Page 1.1.1' },
  { id: '5', parentId: null, title: 'Page 2' },
];

describe('pageUtils', () => {
  describe('buildPageTree', () => {
    it('should build a correct page tree', () => {
      const tree = buildPageTree(mockPages);
      expect(tree).toHaveLength(2);
      expect(tree[0].title).toBe('Page 1');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].title).toBe('Page 1.1');
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].title).toBe('Page 1.1.1');
    });
  });

  describe('getPagePath', () => {
    it('should return the correct path for a nested page', () => {
      const path = getPagePath(mockPages, '4');
      expect(path).toHaveLength(3);
      expect(path.map(p => p.title)).toEqual(['Page 1', 'Page 1.1', 'Page 1.1.1']);
    });

    it('should return a single-item path for a root page', () => {
      const path = getPagePath(mockPages, '5');
      expect(path).toHaveLength(1);
      expect(path[0].title).toBe('Page 2');
    });

    it('should return an empty array for an invalid page ID', () => {
      const path = getPagePath(mockPages, '99');
      expect(path).toHaveLength(0);
    });
  });

  describe('findRootAncestor', () => {
    it('should find the correct root ancestor for a nested page', () => {
      const root = findRootAncestor(mockPages, '4');
      expect(root.title).toBe('Page 1');
    });

    it('should return the page itself if it is a root page', () => {
      const root = findRootAncestor(mockPages, '1');
      expect(root.title).toBe('Page 1');
    });

    it('should return null for an invalid page ID', () => {
      const root = findRootAncestor(mockPages, '99');
      expect(root).toBeNull();
    });
  });
});
