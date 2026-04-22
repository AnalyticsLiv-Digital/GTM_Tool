# 🚀 GTM Tools - Step-by-Step Guide to Run

Follow these steps to run your GTM Tools Next.js application:

---

## **Step 1: Open Terminal/PowerShell**

Open Windows PowerShell or Command Prompt on your computer.

---

## **Step 2: Navigate to Project Folder**

```powershell
cd c:\Users\Admin\Desktop\GTM_Tools\gtm-tools-app
```

Or if you prefer to use the full path:
```powershell
Set-Location 'c:\Users\Admin\Desktop\GTM_Tools\gtm-tools-app'
```

---

## **Step 3: Start Development Server**

Run this command:

```powershell
npm run dev
```

**Or alternatively:**

```powershell
next dev
```

---

## **Step 4: Wait for It to Start**

You should see output like this:

```
✓ Ready in 8.3s
  ▲ Next.js 14.2.5
  - Local:        http://localhost:3000
```

---

## **Step 5: Open in Browser**

Once you see `✓ Ready in 8.3s`, open your web browser and go to:

```
http://localhost:3000
```

Or click this link: [http://localhost:3000](http://localhost:3000)

---

## **Step 6: Use the Application**

### **Create an Account:**
1. Click "Sign up" button
2. Enter your name, email, and password
3. Click "Sign Up" button
4. You'll be redirected to the dashboard

### **Login:**
1. Click "Sign in" button
2. Enter your email and password
3. Click "Sign In" button
4. You'll see your dashboard

### **Logout:**
1. Click the "Logout" button in the dashboard
2. You'll be redirected to the login page

---

## **Troubleshooting**

### **Port Already in Use**

If port 3000 is already in use, run:

```powershell
next dev -p 3001
```

Then visit: `http://localhost:3001`

---

### **Dependencies Not Installed**

If you get an error about missing dependencies:

```powershell
npm install
```

Then run:

```powershell
npm run dev
```

---

### **Build Errors**

Clear the Next.js cache:

```powershell
rm -r .next
npm run dev
```

---

## **Stop the Server**

To stop the development server, press:

```
Ctrl + C
```

in the terminal.

---

## **Other Useful Commands**

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Check code quality |

---

## **Environment Setup (Optional)**

To enable Google OAuth, create a `.env.local` file with:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
JWT_SECRET=your-secret-key
```

---

## **Database**

User data is stored in:
```
.data/users.json
```

This file is created automatically when you first register a user.

---

## **Summary**

**Quick Start:**
```powershell
cd c:\Users\Admin\Desktop\GTM_Tools\gtm-tools-app
npm run dev
```

Then open: **http://localhost:3000**

That's it! Your application will be running. 🎉

---

## **Support**

If you have any issues:

1. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. Check [README.md](./README.md)

**Happy coding!** 🚀
