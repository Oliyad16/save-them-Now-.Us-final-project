# Firebase Setup Instructions for SaveThemNow.Jesus

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Project name: `SaveThemNow.Jesus`
4. Project ID: `savethemnow-jesus` (or similar available ID)
5. Enable Google Analytics (optional)

## Step 2: Enable Firebase Services

### Authentication
1. Go to Authentication > Sign-in method
2. Enable **Email/Password** provider
3. Optional: Enable **Google** provider for social login

### Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Start in **test mode** (we'll deploy security rules later)
4. Choose your preferred location (us-central1 recommended)

### Storage
1. Go to Storage
2. Click "Get started"
3. Start in **test mode**
4. Use same location as Firestore

## Step 3: Get Firebase Configuration

### Client Configuration (Public)
1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Click "Add app" > Web app
4. App nickname: `SaveThemNow Web App`
5. Copy the firebaseConfig object values

### Admin SDK Configuration (Private)
1. Go to Project Settings > Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Keep this file secure - contains private credentials

## Step 4: Update Environment Variables

Update `.env.local` with your actual Firebase values:

```env
# Replace with values from Firebase Console > Project Settings > General
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-actual-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Replace with values from downloaded service account JSON
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Actual-Private-Key\n-----END PRIVATE KEY-----"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

## Step 5: Authenticate Firebase CLI

Run these commands in your terminal:

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase use --add

# Select your project and give it an alias
# Project: your-actual-project-id
# Alias: default

# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

# Deploy storage rules
firebase deploy --only storage
```

## Step 6: Run Data Migration

After completing the above steps, run:

```bash
# Install dependencies if needed
npm install

# Run the migration script
npm run migrate:firebase

# Or manually run:
node scripts/migrate-to-firebase.js
```

## Step 7: Test Integration

```bash
# Start the development server
npm run dev

# Test Firebase MCP integration
npx firebase-tools experimental:mcp

# Verify data in Firebase Console
# Go to Firestore Database and check for migrated collections
```

## Troubleshooting

### Common Issues:
1. **Permission denied**: Make sure you're logged in with `firebase login`
2. **Project not found**: Run `firebase use --add` to select the right project
3. **Rules deployment fails**: Check `firestore.rules` syntax
4. **MCP connection issues**: Restart Claude Desktop after configuration

### Environment Variable Checklist:
- [ ] All `NEXT_PUBLIC_FIREBASE_*` variables set
- [ ] All `FIREBASE_*` admin variables set
- [ ] Private key properly escaped with `\n` for line breaks
- [ ] No trailing spaces or quotes in values

## Security Notes

1. **Never commit** the service account JSON file to git
2. **Keep private keys secure** - they provide admin access
3. **Review security rules** before deploying to production
4. **Use test data** initially to verify everything works

---

✅ Once completed, your Firebase integration will be fully operational with real-time data sync!