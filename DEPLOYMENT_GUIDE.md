# SayNote App Deployment Guide

## 🚀 Production Build & Deployment Process

### Current Build Status

- ✅ Dependencies fixed (React version conflicts resolved)
- ✅ EAS configuration verified
- ✅ Google OAuth setup completed
- 🔄 **Currently building APK...**

### Build Command Used

```bash
eas build -p android --profile preview
```

## 📱 After Build Completes

### 1. Download the APK

Once the build finishes, you'll get a download link. The APK will be available at:

- EAS Dashboard: https://expo.dev/accounts/ayoubsddd/projects/sayNote/builds
- Direct download link (provided in terminal)

### 2. Install on Real Device

```bash
# Option 1: Download directly on your Android device
# Use the QR code or link provided by EAS

# Option 2: Download to computer and transfer
adb install path/to/your-app.apk

# Option 3: Email yourself the APK link and download on device
```

### 3. Test Google OAuth Authentication

#### What to Test:

1. **Open the app** on your Android device
2. **Tap "Sign in with Google"**
3. **Verify the OAuth flow works:**
   - Google account selection appears
   - User can select an account
   - App redirects back properly (using `saynote://auth`)
   - User is logged in successfully

#### Expected Behavior:

- ✅ Google Sign-In opens in browser/Chrome Custom Tab
- ✅ User can select Google account
- ✅ App receives OAuth callback via deep link (`saynote://auth`)
- ✅ User is authenticated and logged into the app
- ✅ App shows user profile/main screen

### 4. Troubleshooting Real Device Issues

#### If OAuth Fails:

1. **Check device logs:**

   ```bash
   # Connect device via USB and enable USB debugging
   adb logcat | grep -i "saynote\|oauth\|google\|auth"
   ```

2. **Test deep link manually:**

   ```bash
   # Test if deep link works
   adb shell am start \
     -W -a android.intent.action.VIEW \
     -d "saynote://auth?code=test" \
     com.sayNote.app
   ```

3. **Verify redirect URIs** in Google Cloud Console:
   - `saynote://auth` (production deep link)
   - Your domain URIs (if any)

#### Common Issues & Solutions:

**Issue: "App not installed" when testing deep link**

- Solution: Make sure APK is properly installed and app can open normally

**Issue: OAuth opens but doesn't redirect back**

- Solution: Verify `saynote://auth` is added to Google Cloud Console redirect URIs
- Check if Chrome Custom Tabs is working properly

**Issue: "redirect_uri_mismatch" error**

- Solution: Double-check all redirect URIs in Google Cloud Console match exactly

## 🔧 Google Cloud Console Configuration

### Required Redirect URIs for Production:

```
saynote://auth
```

### OAuth 2.0 Client Setup:

1. **Client Type:** Android
2. **Package Name:** `com.sayNote.app`
3. **SHA-1 Certificate:** (Use the one from EAS build)

## 📊 Production vs Development Differences

| Aspect       | Development                       | Production        |
| ------------ | --------------------------------- | ----------------- |
| Redirect URI | `http://192.168.x.x:8081/--/auth` | `saynote://auth`  |
| OAuth Client | Web Client ID                     | Android Client ID |
| Testing      | Expo Dev Client                   | Real APK          |
| Deep Links   | Expo proxy                        | Native Android    |

## 🚀 Next Steps After Successful Test

1. **Document working OAuth flow**
2. **Test on multiple devices/Android versions**
3. **Consider Play Store deployment**
4. **Set up production monitoring**

## 📝 Build Information

- **Profile Used:** preview
- **Build Type:** APK
- **Package:** com.sayNote.app
- **Scheme:** saynote
- **EAS Project ID:** 4bee69d0-ddb3-4c0e-bea2-27c56ab22c27

## 🆘 Support & Debugging

If you encounter any issues:

1. Check the EAS build logs
2. Use `adb logcat` for device debugging
3. Verify Google Cloud Console configuration
4. Test deep links manually
5. Check app permissions on device

---

**Remember:** This production APK will use the custom scheme `saynote://auth` for OAuth redirects, which is different from the development environment!
