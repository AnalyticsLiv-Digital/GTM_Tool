# Quick Reference Guide

## 🚀 Start the App

```bash
cd c:\Users\Admin\Desktop\GTM_Tools\gtm-tools-app
npm run dev
```

Visit: http://localhost:3000

## 🔑 Test Credentials

- **Email**: test@example.com
- **Password**: password123

Or create a new account at `/signup`

## 📱 Pages

- `/` - Landing page
- `/login` - Login page
- `/signup` - Registration page
- `/dashboard` - User dashboard (protected)

## 📝 Key Features

### Authentication
- ✅ Email + Password (hashed with bcryptjs)
- ✅ Google OAuth (configure in .env.local)
- ✅ 7-day JWT sessions
- ✅ Protected routes

### API Endpoints
- `POST /api/auth/register` - Sign up
- `POST /api/auth/login` - Sign in
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - Sign out

## 🔐 Setup Google OAuth (Optional)

1. Get Client ID from [Google Cloud Console](https://console.cloud.google.com/)
2. Create `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
   JWT_SECRET=your-secret-key
   ```
3. Restart dev server
4. Test Google button on signup page

## 📂 Important Folders

```
src/
  ├── app/           - Pages & API routes
  ├── components/    - React components
  ├── contexts/      - Auth state
  └── lib/           - Database & utilities

.data/
  └── users.json     - User database (auto-created)
```

## 🛠️ Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm start` | Start prod server |
| `npm run lint` | Check code quality |

## 🐛 Quick Fixes

**Port in use?**
```bash
npm run dev -- -p 3001
```

**Module errors?**
```bash
rm -rf .next && npm run build
```

**Update dependencies?**
```bash
npm install
```

## 📊 Database

User data stored in `.data/users.json`:
- Passwords: Hashed with bcryptjs
- Tokens: JWT format, 7-day expiration
- Backup: Copy `.data/users.json` before testing

## 🌐 URLs

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Home page |
| http://localhost:3000/login | Login |
| http://localhost:3000/signup | Sign up |
| http://localhost:3000/dashboard | Dashboard |

## ✅ Testing Checklist

- [ ] Home page loads
- [ ] Sign up page works
- [ ] Password validation works
- [ ] Email/password login works
- [ ] Can access dashboard when logged in
- [ ] Dashboard redirects to login when not authenticated
- [ ] Logout works
- [ ] Google button appears (if configured)

## 📚 Documentation Files

- `README.md` - Full documentation
- `SETUP_GUIDE.md` - Detailed setup guide
- `GOOGLE_OAUTH_SETUP.md` - Google OAuth instructions
- `.env.example` - Environment variables template

## 🎯 Next Features to Add

- Container CRUD
- Tag management  
- Trigger builder
- Variable management
- Export to CSV
- Version history
- Team collaboration
- Webhook integration

---

**For detailed setup, see: SETUP_GUIDE.md**
