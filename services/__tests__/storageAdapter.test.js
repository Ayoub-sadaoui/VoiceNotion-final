// Mock dependencies
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({}));

describe('storageAdapter', () => {
  const originalOS = require('react-native').Platform.OS;

  beforeEach(() => {
    // Reset modules to clear cache and re-evaluate imports
    jest.resetModules();
    // Restore original Platform.OS before each test
    Object.defineProperty(require('react-native').Platform, 'OS', {
      value: originalOS,
    });
  });

  describe('export logic', () => {
    it('should export AsyncStorage for web platform', () => {
      Object.defineProperty(require('react-native').Platform, 'OS', {
        value: 'web',
      });
      const { storageAdapter } = require('../storageAdapter');
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      expect(storageAdapter).toBe(AsyncStorage);
    });

    it('should export ChunkedSecureStore for ios platform', () => {
      Object.defineProperty(require('react-native').Platform, 'OS', {
        value: 'ios',
      });
      const { storageAdapter, ChunkedSecureStore } = require('../storageAdapter');
      expect(storageAdapter).toBe(ChunkedSecureStore);
    });

    it('should export ChunkedSecureStore for android platform', () => {
      Object.defineProperty(require('react-native').Platform, 'OS', {
        value: 'android',
      });
      const { storageAdapter, ChunkedSecureStore } = require('../storageAdapter');
      expect(storageAdapter).toBe(ChunkedSecureStore);
    });
  });

  describe('ChunkedSecureStore implementation', () => {
    let ChunkedSecureStore;
    let mockSecureStore;

    beforeEach(() => {
      // Re-require dependencies for this suite as modules are reset
      mockSecureStore = require('expo-secure-store');
      ChunkedSecureStore = require('../storageAdapter').ChunkedSecureStore;
      jest.clearAllMocks();
    });

    describe('setItem', () => {
      it('should store small values directly and remove old chunks if they exist', async () => {
        const key = 'smallKey';
        const value = 'smallValue';
        mockSecureStore.getItemAsync.mockResolvedValueOnce('2');
        await ChunkedSecureStore.setItem(key, value);
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${key}_0`);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${key}_1`);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${key}_chunks`);
      });

      it('should store small values directly when no old chunks exist', async () => {
        const key = 'smallKey';
        const value = 'smallValue';
        mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
        await ChunkedSecureStore.setItem(key, value);
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
        expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
      });

      it('should store large values in chunks', async () => {
        const key = 'largeKey';
        const value = 'a'.repeat(2000);
        await ChunkedSecureStore.setItem(key, value);
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(`${key}_chunks`, '2');
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(`${key}_0`, 'a'.repeat(1800));
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(`${key}_1`, 'a'.repeat(200));
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(3);
      });
    });

    describe('getItem', () => {
      it('should retrieve small values directly', async () => {
        const key = 'smallKey';
        const value = 'smallValue';
        mockSecureStore.getItemAsync.mockResolvedValueOnce(null).mockResolvedValueOnce(value);
        const result = await ChunkedSecureStore.getItem(key);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(`${key}_chunks`);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(key);
        expect(result).toBe(value);
      });

      it('should retrieve and reassemble large values from chunks', async () => {
        const key = 'largeKey';
        const value = 'a'.repeat(1800) + 'b'.repeat(200);
        mockSecureStore.getItemAsync.mockImplementation(async (k) => {
          if (k === `${key}_chunks`) return '2';
          if (k === `${key}_0`) return 'a'.repeat(1800);
          if (k === `${key}_1`) return 'b'.repeat(200);
          return null;
        });
        const result = await ChunkedSecureStore.getItem(key);
        expect(result).toBe(value);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(`${key}_chunks`);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(`${key}_0`);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(`${key}_1`);
      });
    });

    describe('removeItem', () => {
      it('should remove small values directly', async () => {
        const key = 'smallKey';
        mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
        await ChunkedSecureStore.removeItem(key);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(`${key}_chunks`);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
      });

      it('should remove all chunks for large values', async () => {
        const key = 'largeKey';
        mockSecureStore.getItemAsync.mockResolvedValueOnce('2');
        await ChunkedSecureStore.removeItem(key);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(`${key}_chunks`);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${key}_chunks`);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${key}_0`);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${key}_1`);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(4);
      });
    });
  });
});
