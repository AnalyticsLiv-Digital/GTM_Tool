# GTM Tools - Complete Setup & Usage Guide

## 📋 Project Overview

GTM Tools is a full-stack Next.js application that provides a modern dashboard for managing Google Tag Manager containers. It includes:

- ✅ Email/Password Authentication
- ✅ Google OAuth Social Login  
- ✅ User Dashboard
- ✅ Backend API with local storage
- ✅ TypeScript & Tailwind CSS
- ✅ Protected Routes

## 🚀 Quick Start

### 1. Navigate to Project

```bash
cd c:\Users\Admin\Desktop\GTM_Tools\gtm-tools-app
```

### 2. Install Dependencies

All dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 3. Setup Environment Variables

Create `.env.local` file in the project root:

```bash
# Create file with environment variables
echo NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id > .env.local
echo JWT_SECRET=your-secret-key >> .env.local
```

Or manually create `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
JWT_SECRET=your-secret-key-change-in-production
```

### 4. Start Development Server

```bash
npm run dev
```

The application will start at: **http://localhost:3000**

## 🔐 Authentication Setup

### Email/Password Authentication (Already Configured)

Users can:
- Sign up with email and password at `/signup`
- Login with email/password at `/login`
- Passwords are securely hashed with bcryptjs
- Sessions are stored with 7-day JWT tokens

### Google OAuth Setup (Optional but Recommended)

To enable Google Sign-up, follow these steps:

#### Step 1: Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" page
5. Click "Create Credentials" > "OAuth 2.0 Client ID"
6. Choose "Web application"
7. Add **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://yourdomain.com` (for production)
8. Add **Authorized redirect URIs**:
   - `http://localhost:3000`
   - `http://yourdomain.com` (for production)
9. Copy the **Client ID**

#### Step 2: Configure Environment

Update `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-copied-client-id
JWT_SECRET=your-secret-key
```

#### Step 3: Test

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Sign up" button
4. Try Google sign-up option

## 📖 Project Pages

| Page | URL | Access | Purpose |
|------|-----|--------|---------|
| Landing | `/` | Public | Home page with features |
| Signup | `/signup` | Public | Register new account |
| Login | `/login` | Public | Login to account |
| Dashboard | `/dashboard` | Protected | Main user dashboard |

## 🔑 User Credentials (Demo)

You can test the app with:

```
Email: test@example.com
Password: password123
```

Or create a new account using the signup form.

## 🗂️ File Structure

```
src/
├── app/
│   ├── api/auth/
│   │   ├── register/route.ts    # Email signup endpoint
│   │   ├── login/route.ts       # Email login endpoint
│   │   ├── google/route.ts      # Google OAuth endpoint
│   │   ├── user/route.ts        # Get user info
│   │   └── logout/route.ts      # Logout endpoint
│   ├── dashboard/page.tsx       # Protected dashboard
│   ├── login/page.tsx           # Login page
│   ├── signup/page.tsx          # Signup page
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── LoginForm.tsx            # Login form
│   ├── SignupForm.tsx           # Signup form
│   └── GoogleLoginButton.tsx    # Google OAuth button
├── contexts/
│   └── AuthContext.tsx          # Auth state management
└── lib/
    ├── db.ts                    # Database functions
    └── auth.ts                  # JWT utilities

.data/                            # Runtime data directory
└── users.json                   # User database (created automatically)
```

## 💾 Database

### User Data Storage

Users are stored in `.data/users.json`:

```json
{
  "id": "user_1234567890_abc",
  "name": "User Name",
  "email": "user@example.com",
  "password": "$2a$10$...",  // bcryptjs hash
  "googleId": "google_id",    // if Google user
  "picture": "https://...",   // user avatar
  "createdAt": "2024-04-06T12:00:00Z"
}
```

### Database Backup

The `.data/users.json` file is created automatically. To backup:

```bash
cp .data/users.json .data/users.json.backup
```

## 🛠️ Development

### Available Commands

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

### Hot Reload

Changes to files automatically reload in the browser while `npm run dev` is running.

### TypeScript

This project uses TypeScript. Type errors will show in:
- Terminal output
- VS Code (with TypeScript extension)
- Browser console

## 🧪 Testing the Auth System

### Test Email Registration

1. Go to http://localhost:3000/signup
2. Enter:
   - Name: Test User
   - Email: testuser@example.com
   - Password: testpass123
3. Click "Sign Up"
4. Should redirect to dashboard

### Test Email Login

1. Go to http://localhost:3000/login
2. Enter:
   - Email: testuser@example.com
   - Password: testpass123
3. Click "Sign In"
4. Should redirect to dashboard

### Test Google Login

1. Go to http://localhost:3000/signup
2. Click Google button
3. Sign in with Google account
4. Should create account and redirect to dashboard

### Test Protected Routes

1. Logout from dashboard
2. Try to access http://localhost:3000/dashboard directly
3. Should redirect to login page

## 🐛 Troubleshooting

### Issue: "Module not found" errors

**Solution:**
```bash
rm -rf .next node_modules
npm install
npm run dev
```

### Issue: Port 3000 already in use

**Solution:**
```bash
npm run dev -- -p 3001
```

### Issue: Build fails

**Solution:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Issue: Google login not working

**Checklist:**
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in `.env.local`
- [ ] Client ID is from Google Cloud Console
- [ ] `http://localhost:3000` is in authorized origins
- [ ] Network tab shows requests to Google API

### Issue: Can't login with email/password

**Solution:**
1. Verify email/password in `.data/users.json`
2. Check if password hash is corrupted
3. Delete the account and create a new one

## 📊 API Examples

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login User

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/user \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"
```

## 🔒 Security Features

- ✅ Password hashing (bcryptjs)
- ✅ JWT token validation
- ✅ HTTP-only cookies
- ✅ CORS protection ready
- ✅ Input validation
- ✅ Protected API routes
- ✅ Protected client routes

## 🚀 Production Deployment

### Before Deploying

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set up proper database (MongoDB/PostgreSQL)
- [ ] Enable HTTPS
- [ ] Configure Google OAuth for production domains
- [ ] Set up error logging (Sentry, etc.)
- [ ] Configure environment variables on hosting

### Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# In Vercel dashboard:
# 1. Connect GitHub repo
# 2. Add environment variables:
#    - NEXT_PUBLIC_GOOGLE_CLIENT_ID
#    - JWT_SECRET
# 3. Deploy
```

## 📚 Next Steps

1. **Add More Features**
   - Container CRUD operations
   - Tag management
   - Trigger builder
   - Variable management

2. **Improve Storage**
   - Migrate to MongoDB/PostgreSQL
   - Add data backup system
   - Implement data versioning

3. **Enhance Security**
   - Add email verification
   - Implement 2FA
   - Add rate limiting
   - Add audit logs

4. **Optimize Performance**
   - Add caching
   - Implement CDN
   - Optimize images
   - Code splitting

## 📞 Support

For issues:
1. Check troubleshooting section above
2. Review `GOOGLE_OAUTH_SETUP.md`
3. Check Next.js documentation
4. Review browser console for errors
5. Check terminal output for compilation errors

## 📄 License

MIT - Free to use and modify

---

**Happy coding! 🎉**
