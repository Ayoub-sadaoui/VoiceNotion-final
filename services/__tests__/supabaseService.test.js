// Mock dependencies
jest.mock('@supabase/supabase-js', () => {
  const mockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    updateUser: jest.fn(),
  };

  return {
    createClient: jest.fn(() => ({
      auth: mockAuth,
    })),
  };
});

jest.mock('../storageAdapter', () => ({
  storageAdapter: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Linking: {
    createURL: jest.fn((path) => `exp://127.0.0.1:8081/${path}`),
  },
  Platform: {
    OS: 'ios',
  }
}));

// Import functions to test
const {
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  resetPassword,
  getCurrentUser,
  getSession,
} = require('../supabaseService');

// Import the mocked client to access the mock functions
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient();

describe('supabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should call supabase.auth.signUp with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse = { data: { user: { id: '123' } }, error: null };
      supabase.auth.signUp.mockResolvedValue(mockResponse);

      const result = await signUp(email, password);

      expect(supabase.auth.signUp).toHaveBeenCalledWith({ email, password });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('signIn', () => {
    it('should call supabase.auth.signInWithPassword with correct credentials', async () => {
        const email = 'test@example.com';
        const password = 'password123';
        const mockResponse = { data: { user: { id: '123' } }, error: null };
        supabase.auth.signInWithPassword.mockResolvedValue(mockResponse);

        const result = await signIn(email, password);

        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email, password });
        expect(result).toEqual(mockResponse);
    });
  });

  describe('signInWithGoogle', () => {
    it('should call supabase.auth.signInWithOAuth with google provider', async () => {
        const mockOAuthResponse = { data: { provider: 'google', url: 'http://supabase-auth-url' }, error: null };
        const mockSessionResponse = { data: { session: { access_token: 'mock-token' } }, error: null };

        supabase.auth.signInWithOAuth.mockResolvedValue(mockOAuthResponse);
        supabase.auth.getSession.mockResolvedValue(mockSessionResponse);
        require('expo-web-browser').openAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'exp://' });

        await signInWithGoogle();

        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
            provider: 'google',
            options: {
                redirectTo: 'sayNote://auth/callback',
                scopes: 'email profile',
            },
        });
        expect(require('expo-web-browser').openAuthSessionAsync).toHaveBeenCalledWith('http://supabase-auth-url', 'sayNote://auth/callback');
    });
  });

  describe('signOut', () => {
    it('should call supabase.auth.signOut', async () => {
        const mockResponse = { error: null };
        supabase.auth.signOut.mockResolvedValue(mockResponse);

        const result = await signOut();

        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
  });

  describe('resetPassword', () => {
    it('should call supabase.auth.resetPasswordForEmail with correct email', async () => {
        const email = 'test@example.com';
        const mockResponse = { data: {}, error: null };
        supabase.auth.resetPasswordForEmail.mockResolvedValue(mockResponse);

        const result = await resetPassword(email);

        expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email);
        expect(result).toEqual(mockResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should call supabase.auth.getUser and return the user', async () => {
        const mockUser = { id: '123' };
        const mockResponse = { data: { user: mockUser }, error: null };
        supabase.auth.getUser.mockResolvedValue(mockResponse);

        const result = await getCurrentUser();

        expect(supabase.auth.getUser).toHaveBeenCalled();
        expect(result).toEqual(mockUser);
    });
  });

  describe('getSession', () => {
    it('should call supabase.auth.getSession and return the session', async () => {
        const mockSession = { access_token: 'abc' };
        const mockResponse = { data: { session: mockSession }, error: null };
        supabase.auth.getSession.mockResolvedValue(mockResponse);

        const result = await getSession();

        expect(supabase.auth.getSession).toHaveBeenCalled();
        expect(result).toEqual(mockSession);
    });
  });
});
