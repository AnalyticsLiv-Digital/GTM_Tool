# ✅ Google OAuth Setup Verification Checklist

## Your Current Setup Status

### ✅ Environment Variables Configured
- **Client ID**: `1032750726814-gfi0okjooq6dgt7qv03caj2v3s5u0mlm.apps.googleusercontent.com`
- **Project ID**: `unified-ion-492710-f1`
- **JWT Secret**: Configured in `.env.local`

### ✅ Application Code Ready
- Google OAuth Button component configured
- Authentication context set up with `credentials: 'include'`
- Google login API endpoint ready at `/api/auth/google`
- JWT token generation configured

---

## 📋 Google Cloud Console Setup - CRITICAL STEPS

### ⚠️ REQUIRED: Authorized JavaScript Origins

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **unified-ion-492710-f1**
3. Navigate to **Credentials** (left menu)
4. Click on your OAuth 2.0 Client ID (Web application)
5. Under **Authorized JavaScript origins**, ensure these are added:
   ```
   http://localhost:3000
   http://localhost:3001
   http://192.168.0.11:3000
   https://yourdomain.com  (add your production domain later)
   ```
6. Click **Save**

### ⚠️ REQUIRED: Authorized Redirect URIs

Still in the same OAuth 2.0 Client ID settings:

1. Under **Authorized redirect URIs**, ensure these are added:
   ```
   http://localhost:3000/api/auth/google
   http://localhost:3001/api/auth/google
   http://192.168.0.11:3000/api/auth/google
   https://yourdomain.com/api/auth/google  (add your production domain later)
   ```
2. Click **Save**

### ⚠️ REQUIRED: OAuth Consent Screen

1. Go to **OAuth consent screen** (left menu)
2. Ensure **User Type** is set to **External**
3. Fill in the required fields:
   - **App name**: GTM Tools
   - **User support email**: your-email@gmail.com
   - **Developer contact information**: your-email@gmail.com
4. Click **Save and Continue**

---

## 🧪 Testing the Setup

### Step 1: Start the Application
```bash
npm run dev
```
Application will run at: `http://localhost:3000`

### Step 2: Test Google Login
1. Visit `http://localhost:3000`
2. Click **"Sign Up"** button
3. Click **"Sign up with Google"**
4. Go through Google's login flow
5. You should be redirected to the dashboard

### Step 3: Verify in Browser Console (F12)
Look for:
- ✅ No CORS errors
- ✅ No "Redirect URI mismatch" errors
- ✅ Successful POST to `/api/auth/google`
- ✅ Auth cookie set (check Application tab → Cookies)

### Step 4: Test API Endpoint
After logging in, visit: `http://localhost:3000/api/auth/user`
Should return your user data (not 401 error)

---

## 🔑 Environment Variables (Already Configured)

Your `.env.local` file:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1032750726814-gfi0okjooq6dgt7qv03caj2v3s5u0mlm.apps.googleusercontent.com
JWT_SECRET=test-secret-key-change-in-production
```

> **Note**: Change `JWT_SECRET` to a strong random key before production deployment

---

## 🚀 Production Setup

When deploying to production:

1. **Update Authorized Origins** to include your domain:
   ```
   https://yourdomain.com
   ```

2. **Update Redirect URIs** to include your domain:
   ```
   https://yourdomain.com/api/auth/google
   ```

3. **Secure JWT Secret**: Generate a strong random key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Use HTTPS only** in production

---

## ✨ Features Enabled

- ✅ Google OAuth Sign-up/Sign-in
- ✅ Email/Password Registration
- ✅ Email/Password Login
- ✅ Persistent Authentication (7-day JWT tokens)
- ✅ Protected Routes
- ✅ User Dashboard
- ✅ Logout
- ✅ User Profile Storage

---

## ❌ If OAuth Doesn't Work

**Common Issues & Fixes:**

| Issue | Solution |
|-------|----------|
| "Redirect URI mismatch" | Add `http://localhost:3000/api/auth/google` to Google Cloud Console |
| CORS error | Ensure `http://localhost:3000` is in Authorized JavaScript origins |
| 401 on `/api/auth/user` | Clear cookies (Ctrl+Shift+Delete) and try login again |
| No Google button showing | Check browser console (F12). Ensure `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is in `.env.local` |
| Login works but no redirect | Verify `credentials: 'include'` is in fetch requests (already fixed ✓) |

---

## 📚 API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Email/password registration |
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/google` | POST | Google OAuth login/registration |
| `/api/auth/user` | GET | Get current user (requires auth cookie) |
| `/api/auth/logout` | POST | Logout & clear auth cookie |

---

## ✅ Ready to Test?

1. Verify the setup in Google Cloud Console ☝️
2. Start app: `npm run dev`
3. Visit: `http://localhost:3000`
4. Click "Sign Up" → "Sign up with Google"
5. Enjoy! 🎉
