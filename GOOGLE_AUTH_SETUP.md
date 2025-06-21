# Google OAuth Setup for sayNote

This guide will help you set up Google OAuth for your sayNote app using Supabase.

## 1. Create a Google OAuth Client

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click on "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add a name for your OAuth client (e.g., "sayNote OAuth")
7. Add authorized JavaScript origins:
   - For development with Expo: `https://auth.expo.io`
   - For development: `http://localhost:8081`
   - For production: Your app's domain (if applicable)
8. Add authorized redirect URIs:
   - For development: `https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback`
   - For Expo: `https://auth.expo.io/@your-expo-username/sayNote`
   - For production: Same as above
9. Click "Create"
10. Note your Client ID and Client Secret

## 2. Configure Supabase Auth

1. Go to your Supabase dashboard
2. Navigate to "Authentication" > "Providers"
3. Find "Google" in the list and click on it
4. Enable the provider by toggling the switch
5. Enter the Client ID and Client Secret from the Google Cloud Console
6. Add the following redirect URLs:
   - `sayNote://auth/callback`
   - `exp://localhost:8081/--/auth/callback` (for Expo development)
   - `https://auth.expo.io/@your-expo-username/sayNote` (for Expo Go)
   - Your production URL if applicable
7. Save the changes

## 3. Install Required Packages

Make sure you have the necessary packages installed:

```bash
npm install expo-web-browser
```

## 4. Environment Setup

Make sure your `.env` file contains the correct Supabase URL and anon key:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 5. Test the Integration

1. Run your app in development mode
2. Go to the login screen
3. Tap the "Continue with Google" button
4. A browser window/tab should open with the Google login page
5. After logging in, you should be redirected back to your app
6. The app should navigate to the home screen if authentication is successful

## Troubleshooting

### Common Issues

- **Redirect URI Mismatch**: This is the most common error. Ensure that:

  - The redirect URIs in both Google Cloud Console and Supabase match exactly
  - For Expo development, use `exp://localhost:8081/--/auth/callback`
  - For Expo Go, use `https://auth.expo.io/@your-expo-username/sayNote`
  - For standalone apps, use `sayNote://auth/callback`

- **Browser Not Opening**:

  - Make sure you've installed the `expo-web-browser` package
  - Check that the URL returned from Supabase is being passed to `WebBrowser.openAuthSessionAsync`

- **Invalid Client ID**:

  - Double-check that you've copied the correct Client ID and Client Secret
  - Make sure there are no extra spaces or characters
  - Verify that the Google OAuth client is enabled in Google Cloud Console

- **Callback Not Working**:

  - Make sure you've configured the app.json file correctly with the proper scheme
  - Check that the deep linking is set up correctly
  - Verify that the callback handler is properly implemented

- **Environment Variables Not Loading**:
  - Check that your `.env` file is in the root directory
  - Make sure the variable names start with `EXPO_PUBLIC_`
  - Restart your development server after changing environment variables

### Debug Steps

1. **Enable Console Logging**: Add console.log statements to track the flow
2. **Check Network Requests**: Monitor network traffic to see if requests to Google/Supabase are being made
3. **Verify Supabase Setup**: Check Authentication settings in Supabase dashboard
4. **Test with Different Platforms**: Try on web, iOS, and Android to isolate platform-specific issues

### Specific Error Messages

- **"Invalid redirect_uri"**: Your redirect URI is not registered in Google Cloud Console or Supabase
- **"Error 400: redirect_uri_mismatch"**: The redirect URI doesn't match what's registered
- **"Client authentication failed"**: Client ID or secret is incorrect

## Production Considerations

Before deploying to production:

1. Update the redirect URIs in both Google Cloud Console and Supabase to include your production URLs
2. Update the `redirectTo` URL in the `signInWithGoogle` function to use your production URL if necessary
3. Test the flow in a production build to ensure everything works correctly
