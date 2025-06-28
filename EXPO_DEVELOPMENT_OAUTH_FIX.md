# 🛠️ EXPO DEVELOPMENT OAUTH FIX

## 🎯 Issue Identified

You're using **Expo development mode** locally, which means:

- ❌ Custom schemes (`saynote://auth`) don't work
- ❌ App isn't installed, so deep links fail
- ✅ Need to use Expo development server URL instead

## 🔧 Solution: Use Expo Development Server URL

### Your Development Server URL

```
http://192.168.100.3:8081/--/auth
```

## ⚙️ Required Configuration Updates

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Edit your **Web OAuth 2.0 Client ID**
4. In **"Authorized redirect URIs"**, **ADD**:
   ```
   http://192.168.100.3:8081/--/auth
   ```
5. **Keep existing URIs** (don't remove `saynote://auth`)
6. Click **Save**

### 2. Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication > URL Configuration**
3. In **"Redirect URLs"**, **ADD**:
   ```
   http://192.168.100.3:8081/--/auth
   ```
4. **Keep existing URIs** (don't remove `saynote://auth`)
5. Click **Save**

## 🧪 Test the Fix

### 1. Manual URL Test

Open your **phone browser** and type:

```
http://192.168.100.3:8081/--/auth
```

**Expected:** Should open your Expo app (might show a loading screen)

### 2. Test Google OAuth

1. **Restart your Expo app:**

   ```bash
   npx expo start --clear
   ```

2. **Try Google login again**

3. **Look for these logs:**
   ```
   🔗 Using redirect URL: http://192.168.100.3:8081/--/auth
   🌐 Opening OAuth URL in browser
   ✅ OAuth URL redirect successful
   ```

## 🎯 Expected Flow

1. **Tap "Continue with Google"**
2. **Browser opens with Google consent**
3. **Select account → Google redirects to:** `http://192.168.100.3:8081/--/auth`
4. **Expo development server receives the redirect**
5. **App detects OAuth completion**
6. **Session established and redirect to home**

## 🔄 Code Changes Made

The OAuth service now automatically detects development mode:

```javascript
// Development: http://192.168.100.3:8081/--/auth
// Production: saynote://auth
const redirectUrl = isDevelopment
  ? "http://192.168.100.3:8081/--/auth"
  : "saynote://auth";
```

## 📱 IP Address Note

Your current development IP is `192.168.100.3`. If you:

- **Restart your router/WiFi**
- **Connect to different network**
- **Your IP changes**

You'll need to:

1. **Check new IP:** `ifconfig | grep "inet "`
2. **Update redirect URIs** in Google Cloud Console and Supabase
3. **Update the code** with new IP

## 🚨 After Adding the URLs

1. **Add the development URL to both Google and Supabase**
2. **Restart Expo:** `npx expo start --clear`
3. **Test the manual URL first**
4. **Then test Google OAuth**

This should fix the redirect issue for Expo development! 🚀
