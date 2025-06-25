import { COMMAND_CATEGORIES, COMMAND_TYPES, COMMAND_PATTERNS } from '../voiceCommandPatterns';

describe('voiceCommandPatterns', () => {
  it('should have a valid structure for all command patterns', () => {
    expect(Array.isArray(COMMAND_PATTERNS)).toBe(true);
    expect(COMMAND_PATTERNS.length).toBeGreaterThan(0);

    const categoryValues = Object.values(COMMAND_CATEGORIES);
    const typeValues = Object.values(COMMAND_TYPES);

    COMMAND_PATTERNS.forEach(command => {
      expect(command).toHaveProperty('category');
      expect(categoryValues).toContain(command.category);

      expect(command).toHaveProperty('type');
      expect(typeValues).toContain(command.type);

      expect(command).toHaveProperty('patterns');
      expect(Array.isArray(command.patterns)).toBe(true);
      expect(command.patterns.length).toBeGreaterThan(0);

      expect(command).toHaveProperty('examples');
      expect(Array.isArray(command.examples)).toBe(true);
      expect(command.examples.length).toBeGreaterThan(0);
    });
  });
});
