

# 🔥 Firebase Project Setup & Credentials Configuration

## Step 1: Create Firebase Project

### 1.1 Go to Firebase Console
1. Open your browser and go to: https://console.firebase.google.com/
2. Sign in with your Google account
3. Click **"Create a project"** or **"Add project"**

### 1.2 Configure Project Details
1. **Project name**: `SaveThemNow Jesus` (or your preferred name)
2. **Project ID**: `savethemnow-jesus` (this must be globally unique)
   - If taken, try: `savethemnow-jesus-2024`, `savethemnow-jesus-app`, etc.
   - **Write down your actual Project ID** - you'll need it later
3. **Analytics**: Choose "Enable Google Analytics" (recommended)
4. **Analytics account**: Select existing or create new
5. Click **"Create project"**
6. Wait for project creation (30-60 seconds)
7. Click **"Continue"**

---

## Step 2: Enable Firestore Database

### 2.1 Navigate to Firestore
1. In the Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**

### 2.2 Security Rules
1. Choose **"Start in test mode"** for now
   - This allows read/write access for 30 days
   - We'll deploy proper security rules later
2. Click **"Next"**

### 2.3 Database Location
1. Choose your closest region (e.g., `us-central1` for USA)
2. **Important**: This cannot be changed later
3. Click **"Done"**
4. Wait for database creation

---

## Step 3: Enable Authentication

### 3.1 Navigate to Authentication
1. Click **"Authentication"** in the left sidebar
2. Click **"Get started"**

### 3.2 Configure Sign-in Methods
1. Go to **"Sign-in method"** tab
2. Enable **"Email/Password"**:
   - Click on "Email/Password"
   - Toggle **"Enable"** to ON
   - Click **"Save"**
3. **Optional**: Enable **"Google"** provider:
   - Click on "Google"
   - Toggle **"Enable"** to ON
   - Enter your project name as display name
   - Click **"Save"**

---

## Step 4: Get Firebase Configuration

### 4.1 Add Web App
1. Go to **Project Overview** (click the gear icon ⚙️ → Project settings)
2. Scroll down to **"Your apps"** section
3. Click the **web icon** `</>`
4. **App nickname**: `SaveThemNow Web App`
5. **Don't** check "Firebase Hosting" for now
6. Click **"Register app"**

### 4.2 Copy Configuration
You'll see something like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef",
  measurementId: "G-XXXXXXXXXX"
};
```

**📋 COPY ALL THESE VALUES** - you'll need them in the next step!

### 4.3 Generate Service Account Key
1. Still in **Project Settings**, go to **"Service accounts"** tab
2. Click **"Generate new private key"**
3. Click **"Generate key"** in the popup
4. A JSON file will download - **keep this file secure!**
5. Open the downloaded JSON file, you'll need these values:
   - `project_id`
   - `client_email`
   - `private_key`

---

## Step 5: Update Environment Variables

### 5.1 Update .env.local
Open your `.env.local` file and replace the placeholder values:

```env
# Firebase Client (Public) - Replace with your actual values
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_ACTUAL_API_KEY_HERE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-actual-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin (Private) - Replace with values from service account JSON
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Actual-Private-Key-Here\n-----END PRIVATE KEY-----"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### 5.2 Important Notes
- **Keep quotes around the private key**
- **Replace `\n` with actual newlines if needed**
- **Never commit real credentials to git**

---

## Step 6: Firebase CLI Setup

### 6.1 Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 6.2 Login to Firebase
```bash
firebase login
```
- This will open a browser window
- Sign in with the same Google account used for the Firebase project
- Authorize Firebase CLI

### 6.3 Initialize Firebase in Your Project
```bash
cd /path/to/your/project
firebase init
```

Select these services:
- ✅ **Firestore**: Configure security rules and indexes
- ✅ **Hosting**: Configure files for Firebase Hosting (optional)
- ✅ **Storage**: Configure security rules for Cloud Storage

### 6.4 Configure Firebase Project
1. **Choose project**: Select "Use an existing project"
2. **Select your project**: Choose the project you created above
3. **Firestore rules**: Press Enter to use default (`firestore.rules`)
4. **Firestore indexes**: Press Enter to use default (`firestore.indexes.json`)
5. **Public directory**: Type `out` (for Next.js static export)
6. **Single-page app**: Type `y` (yes)
7. **Automatic builds**: Type `n` (no) for now

---

## Step 7: Deploy Security Rules and Indexes

### 7.1 Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 7.2 Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### 7.3 Verify Deployment
Check that your rules were deployed:
```bash
firebase firestore:rules:get
```

---

## Step 8: Test Firebase Connection

### 8.1 Build Your App
```bash
npm run build
```
Should build successfully without errors.

### 8.2 Test API Endpoints
```bash
npm run dev
```

Then visit:
- http://localhost:3006/api/missing-persons
- Check the response for `"source": "firestore"` in the meta data

### 8.3 Check Firebase Console
1. Go back to Firestore in Firebase Console
2. You should see your database structure
3. Initially, it will be empty until you run migrations

---

## Step 9: Run Data Migration

### 9.1 Migrate Existing Data
```bash
npm run migrate:firebase
```

### 9.2 Verify Migration
1. Check Firebase Console → Firestore
2. You should see collections:
   - `missing_persons`
   - `users`
   - `donations`
   - `subscriptions`

### 9.3 Test API with Real Data
Visit: http://localhost:3006/api/missing-persons

Response should show:
```json
{
  "data": [...],
  "meta": {
    "source": "firestore",
    "total": X,
    "limit": 100,
    "offset": 0
  }
}
```

---

## 🚨 Troubleshooting

### Issue: "Failed to authenticate"
**Solution**: Run `firebase login` and ensure you're logged in

### Issue: "Permission denied"
**Solution**: Check your Firestore security rules, ensure test mode is enabled

### Issue: "Project not found"
**Solution**: Verify your `FIREBASE_PROJECT_ID` matches exactly

### Issue: "Invalid private key"
**Solution**: Ensure the private key in `.env.local` is properly formatted with `\n` for newlines

### Issue: API returns "csv_fallback"
**Solution**: Your Firebase credentials aren't working, check environment variables

---

## 🔐 Security Checklist

- [ ] Service account JSON file is **NOT** in your git repository
- [ ] `.env.local` is in your `.gitignore`
- [ ] Private keys are properly formatted
- [ ] Project ID matches exactly between console and environment
- [ ] Firestore rules are deployed
- [ ] Test mode is enabled (for initial setup)

---

## 📞 Need Help?

If you encounter issues:
1. Check the Firebase Console error logs
2. Check your browser's network tab for API calls
3. Check the terminal output during migration
4. Verify all environment variables are set correctly

Your Firebase project should now be fully configured and ready for production use! 🎉