# 🔥 Get Firebase Admin Service Account Credentials

## Quick Steps to Get Your Service Account Key:

### 1. Go to Firebase Console
- Open: https://console.firebase.google.com/
- Select your project: **save-them-now**

### 2. Navigate to Service Accounts
- Click the **gear icon** ⚙️ (Project Settings)
- Go to **"Service accounts"** tab

### 3. Generate Private Key
- Click **"Generate new private key"**
- Click **"Generate key"** in the popup
- A JSON file will download (keep this secure!)

### 4. Extract the Required Values
Open the downloaded JSON file and copy these values to your `.env.local`:

```json
{
  "type": "service_account",
  "project_id": "save-them-now",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@save-them-now.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

### 5. Update Your .env.local
Replace these lines in your `.env.local` file:

```bash
FIREBASE_PROJECT_ID=save-them-now
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@save-them-now.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Actual-Private-Key-Here\n-----END PRIVATE KEY-----"
```

**Important Notes:**
- Keep the quotes around the private key
- Don't commit the service account JSON file to git
- The private key should include the `\n` characters as shown

### 6. Restart Your Development Server
After updating `.env.local`, restart your dev server:
```bash
npm run dev
```

## 🔒 Security Checklist
- [ ] Service account JSON file is NOT in your git repository
- [ ] `.env.local` is in your `.gitignore`
- [ ] Private key is properly formatted with quotes and `\n`

Once you've updated the credentials, the Firebase integration should work!