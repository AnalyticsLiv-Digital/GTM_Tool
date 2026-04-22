# GTM Tools - Next.js Application

A modern, full-stack Google Tag Manager (GTM) dashboard built with Next.js, featuring authentication, user management, and container management capabilities.

## 🚀 Features

- **User Authentication**
  - Email/Password Registration & Login
  - Google OAuth Sign-up & Sign-in
  - Secure JWT-based sessions (7-day expiration)
  - Password hashing with bcryptjs

- **Dashboard**
  - User profile display
  - Quick action cards
  - Container management interface
  - Project history

- **Backend API**
  - RESTful authentication endpoints
  - Local JSON-based data storage
  - Secure cookie-based sessions
  - TypeScript for type safety

- **Security**
  - Hashed passwords
  - JWT token verification
  - HTTP-only cookies
  - CORS protection ready

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.2.2 with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: JWT + bcryptjs
- **Database**: Local JSON storage (`.data/users.json`)
- **State Management**: React Context API
- **Runtime**: Node.js

## 📋 Prerequisites

- Node.js 18+ (v21.7.3 recommended)
- npm 10.5.0+

## 🚀 Getting Started

### 1. Installation

```bash
# Install dependencies
npm install
```

### 2. Environment Setup

Copy the example environment file and update with your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Get this from Google Cloud Console
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here

# Change this in production!
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📚 Available Scripts

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run ESLint checks
npm run lint
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── register/route.ts      # Email/password signup
│   │       ├── login/route.ts         # Email/password login
│   │       ├── google/route.ts        # Google OAuth
│   │       ├── user/route.ts          # Get current user
│   │       └── logout/route.ts        # Logout
│   ├── (pages)
│   │   ├── page.tsx                   # Landing page
│   │   ├── login/page.tsx             # Login page
│   │   ├── signup/page.tsx            # Signup page
│   │   ├── dashboard/page.tsx         # Protected dashboard
│   │   └── layout.tsx                 # Root layout with auth provider
│   └── globals.css                    # Global styles
├── components/
│   ├── LoginForm.tsx                  # Login form component
│   ├── SignupForm.tsx                 # Signup form component
│   └── GoogleLoginButton.tsx          # Google OAuth button
├── contexts/
│   └── AuthContext.tsx                # Auth state management
└── lib/
    ├── db.ts                          # Database operations
    └── auth.ts                         # JWT & auth utilities

public/                                 # Static assets
.data/                                  # User data storage (created at runtime)
└── users.json                         # User records
```

## 🔐 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/google` | Login/register with Google |
| GET | `/api/auth/user` | Get current user (requires auth) |
| POST | `/api/auth/logout` | Logout and clear session |

### Request/Response Examples

**Register:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Google OAuth:**
```bash
POST /api/auth/google
Content-Type: application/json

{
  "googleId": "google_user_id",
  "name": "John Doe",
  "email": "john@gmail.com",
  "picture": "https://..."
}
```

## 🔧 Google OAuth Setup

Follow the [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) guide to:

1. Create a Google Cloud project
2. Get OAuth 2.0 credentials
3. Add authorized origins and redirect URIs
4. Configure environment variables

## 💾 Data Storage

User data is stored locally in `.data/users.json`:

```json
[
  {
    "id": "user_1234567890_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "password": "$2a$10$...", // hashed
    "picture": "https://...",
    "createdAt": "2024-04-06T12:00:00.000Z"
  }
]
```

**Note**: This is for development only. For production, use a proper database (MongoDB, PostgreSQL, etc.).

## 🛡️ Security Notes

- Passwords are hashed with bcryptjs (10-round salt)
- JWT tokens expire after 7 days
- Tokens stored in HTTP-only cookies
- Database queries are protected from injection
- Environment variables for sensitive data

**Production Checklist:**
- [ ] Change JWT_SECRET to a strong, random value
- [ ] Migrate to a real database (MongoDB, PostgreSQL, etc.)
- [ ] Enable HTTPS
- [ ] Add CSRF protection
- [ ] Implement rate limiting
- [ ] Add email verification
- [ ] Implement password reset flow
- [ ] Add request logging
- [ ] Set up error tracking (Sentry, etc.)

## 🎯 Usage

### Sign Up
1. Click "Sign up" on the home page
2. Fill in your details or use Google sign-up
3. You'll be redirected to the dashboard

### Sign In
1. Click "Sign in" on the home page
2. Enter your credentials
3. Access your personalized dashboard

### Protected Routes
- `/dashboard` - Requires authentication
- Redirects to login if not authenticated

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys on push
```

Configure environment variables in Vercel dashboard:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `JWT_SECRET`

### Other Platforms

```bash
# Build for production
npm run build

# Start server
npm start

# Set environment variables as needed
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Google Login Not Working
- Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set
- Verify Google Cloud credentials
- Check authorized origins match your domain
- Ensure redirect URI is correct

## 📖 Documentation
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Overview of what's been built
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference guide- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Google OAuth configuration
- [Next.js Documentation](https://nextjs.org)
- [Tailwind CSS Documentation](https://tailwindcss.com)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project

## 🆘 Support

For issues and questions, please check:
- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
- [Next.js Docs](https://nextjs.org/docs)
- GitHub Issues (create a new one if needed)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
