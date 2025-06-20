# Authentication Screens

## Login Screen

![Login Screen](./login.png)

### Description

The Login Screen allows existing users to authenticate and access their account. It provides fields for email and password entry, along with options for alternative login methods and account recovery.

### Key UI Elements

- App Logo/Branding
- Email Input Field
- Password Input Field
- Login Button
- "Forgot Password" Link
- "Sign Up" Link for new users
- Social Login Options (if implemented)

### User Interactions

- Enter credentials and tap login: Authenticates user
- Tap "Forgot Password": Navigates to password recovery
- Tap "Sign Up": Navigates to registration screen
- Tap social login buttons: Initiates third-party authentication

### Navigation

- Initial screen if user is not logged in
- Successful login navigates to Home Screen
- Can navigate to Signup Screen or Forgot Password Screen

---

## Signup Screen

![Signup Screen](./signup.png)

### Description

The Signup Screen allows new users to create an account by providing their information and setting up credentials.

### Key UI Elements

- App Logo/Branding
- Name Input Field
- Email Input Field
- Password Input Field
- Confirm Password Field
- Terms & Conditions Checkbox
- Sign Up Button
- "Already have an account" Login Link

### User Interactions

- Fill form and tap sign up: Creates new account
- Tap login link: Returns to login screen
- Check/uncheck terms: Enables/disables signup button

### Navigation

- Accessible from Login Screen
- Successful registration navigates to Home Screen or onboarding

---

## Forgot Password Screen

![Forgot Password Screen](./forgot-password.png)

### Description

The Forgot Password Screen allows users to reset their password by providing their email address to receive recovery instructions.

### Key UI Elements

- App Logo/Branding
- Email Input Field
- Submit/Reset Button
- Back to Login Link

### User Interactions

- Enter email and submit: Sends password reset instructions
- Tap back to login: Returns to login screen

### Navigation

- Accessible from Login Screen
- Successful submission shows confirmation screen or returns to login

---

## Auth Callback Screen

![Auth Callback Screen](./callback.png)

### Description

The Auth Callback Screen is shown during the authentication process, particularly when using third-party authentication providers. It displays loading states and handles authentication tokens.

### Key UI Elements

- Loading Indicator
- Status Message
- App Logo/Branding

### User Interactions

- No direct user interactions, handles authentication flow automatically

### Navigation

- Automatically navigates to Home Screen upon successful authentication
- Returns to Login Screen on authentication failure
