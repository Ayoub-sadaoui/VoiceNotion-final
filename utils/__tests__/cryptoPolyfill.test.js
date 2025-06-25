import { polyfillCrypto } from '../cryptoPolyfill';

describe('cryptoPolyfill', () => {
  const originalCrypto = global.crypto;

  afterEach(() => {
    // Restore original crypto object after each test
    global.crypto = originalCrypto;
  });

  it('should apply polyfill if crypto.getRandomValues is not available', () => {
    // Simulate environment without crypto.getRandomValues
    delete global.crypto;

    polyfillCrypto();

    expect(global.crypto).toBeDefined();
    expect(typeof global.crypto.getRandomValues).toBe('function');

    // Test the polyfill function
    const array = new Uint8Array(10);
    const result = global.crypto.getRandomValues(array);
    expect(result).toBe(array);
    expect(array.some(val => val !== 0)).toBe(true); // Check if array was filled
  });

  it('should not apply polyfill if crypto.getRandomValues is already available', () => {
    // Ensure a mock crypto object exists
    const mockGetRandomValues = jest.fn();
    global.crypto = { getRandomValues: mockGetRandomValues };

    polyfillCrypto();

    expect(global.crypto.getRandomValues).toBe(mockGetRandomValues);
    expect(mockGetRandomValues).not.toHaveBeenCalled();
  });
});
