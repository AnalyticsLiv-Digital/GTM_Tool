# Google OAuth Setup Guide

To enable Google Sign-up functionality, you need to:

## 1. Get Your Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to "OAuth consent screen"
4. Configure your OAuth consent screen (User Type: External)
5. Go to "Credentials"
6. Click "Create Credentials" > "OAuth 2.0 Client IDs"
7. Select "Web application"
8. Add Authorized JavaScript origins:
   - http://localhost:3000 (for development)
   - Your production domain
9. Add Authorized redirect URIs:
   - http://localhost:3000/api/auth/google
   - Your production callback URL
10. Copy the Client ID

## 2. Add Environment Variables

Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
JWT_SECRET=your-secret-key-change-in-production
```

## 3. Test the Application

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000
3. Click "Sign Up" and use the Google sign-up option
4. Or use the email/password registration

## Database

User data is stored locally in `.data/users.json`. This is for development purposes only. For production, consider using a proper database like MongoDB or PostgreSQL.

## API Routes

- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Login/register with Google
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - Logout

## Features

✅ Email/Password Registration
✅ Email/Password Login
✅ Google OAuth Sign-up
✅ Persistent Authentication (7-day tokens)
✅ Protected Routes
✅ Dashboard
✅ User Profile
✅ Logout
