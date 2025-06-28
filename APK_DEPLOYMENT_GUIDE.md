# 🚀 EAS Build & APK Deployment Guide

## Current Build Status

- ✅ **Build Started**: Android APK build in progress
- 📱 **Platform**: Android
- 🔧 **Profile**: preview
- 📦 **Output**: APK file
- ⏱️ **Expected Time**: 10-20 minutes

## 📊 Monitor Build Progress

### 1. Check Build Status in Terminal

The build is currently running in your terminal. You'll see output like:

```
✔ Using remote Android credentials (Expo server)
✔ Using Keystore from configuration: Build Credentials ayoubsddd (default)
```

### 2. Monitor via EAS Dashboard

Visit: https://expo.dev/accounts/ayoubsddd/projects/sayNote/builds

### 3. Check Build List (Alternative)

```bash
eas build:list --limit 5
```

## 📱 After Build Completes

### 1. Download APK

You'll receive:

- **QR Code**: Scan with your Android device
- **Direct Download Link**: Click to download APK
- **Dashboard Link**: Available in EAS dashboard

### 2. Install on Android Device

#### Option A: Direct Install (Recommended)

1. Scan the QR code with your Android device
2. Download and install the APK
3. Allow "Install from Unknown Sources" if prompted

#### Option B: Manual Transfer

```bash
# Download APK to computer, then transfer via ADB
adb install /path/to/your-app.apk
```

#### Option C: Email/Cloud

1. Email yourself the download link
2. Open on your Android device
3. Download and install

## 🔐 Google OAuth Testing Checklist

### ✅ Pre-Test Verification

- [ ] Google Cloud Console: `saynote://auth` added to redirect URIs
- [ ] Supabase Dashboard: `saynote://auth` configured
- [ ] Android Client ID configured (not Web Client ID)
- [ ] Test user added to OAuth consent screen

### 🧪 Testing Steps

1. **Open App**: Launch SayNote on your device
2. **Tap Sign In**: Tap "Sign in with Google" button
3. **Browser Opens**: Should open Chrome/browser for OAuth
4. **Select Account**: Choose your Google account
5. **Authorize**: Grant permissions
6. **Redirect Back**: Should return to SayNote app
7. **Logged In**: Should see main app screen with user logged in

### ✅ Success Indicators

- [ ] Google Sign-In opens in browser/Chrome Custom Tab
- [ ] Can select Google account successfully
- [ ] App receives OAuth callback via `saynote://auth`
- [ ] User is authenticated and logged in
- [ ] Main app interface is accessible

## 🐛 Troubleshooting Production Issues

### Issue: App Won't Install

```bash
# Enable install from unknown sources
# Go to Settings > Security > Unknown Sources (enable)
```

### Issue: OAuth Doesn't Work

```bash
# Check device logs
adb logcat | grep -i "saynote\|oauth\|google"
```

### Issue: Deep Link Not Working

```bash
# Test deep link manually
adb shell am start \
  -W -a android.intent.action.VIEW \
  -d "saynote://auth?code=test" \
  com.sayNote.app
```

### Issue: "redirect_uri_mismatch"

- Verify `saynote://auth` is in Google Cloud Console
- Check package name: `com.sayNote.app`
- Ensure using Android Client ID (not Web)

## 📋 Build Configuration Used

### EAS Profile: preview

```json
{
  "distribution": "internal",
  "android": {
    "buildType": "apk",
    "image": "latest"
  },
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "https://eozfitnpenjpmstpfxsv.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "[CONFIGURED]",
    "EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY": "[CONFIGURED]",
    "EXPO_PUBLIC_GEMINI_API_KEY": "[CONFIGURED]"
  }
}
```

### App Configuration

- **Package**: com.sayNote.app
- **Scheme**: saynote
- **Bundle ID**: com.sayNote.app

## 🔄 Production vs Development Differences

| Feature        | Development                    | Production APK      |
| -------------- | ------------------------------ | ------------------- |
| OAuth Redirect | `http://local-ip:8081/--/auth` | `saynote://auth`    |
| Google Client  | Web Client ID                  | Android Client ID   |
| Deep Links     | Expo proxy                     | Native Android      |
| Installation   | Expo Dev Client                | Real APK            |
| Testing Device | Simulator/Dev Client           | Real Android device |

## 📞 Next Steps After Successful Test

1. **Document working setup** for future reference
2. **Test on multiple devices** (different Android versions)
3. **Consider Play Store deployment** (requires signed APK)
4. **Set up crash reporting** (Sentry, Crashlytics)
5. **Monitor authentication metrics**

## 🆘 If Build Fails

Check common failure points:

- Node.js/npm dependency issues
- Missing environment variables
- EAS credentials problems
- Android build tools issues

Run diagnostics:

```bash
eas build:inspect --platform android --profile preview
```

---

## 📱 **Current Action Required**

**Wait for build to complete** (10-20 minutes), then download and test the APK on your Android device!
