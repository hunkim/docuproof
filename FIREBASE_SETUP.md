# Firebase Setup Guide for Proofreader Writer

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Project name: `proofreader-writer` (or your preferred name)
4. Enable Google Analytics (recommended)
5. Choose your Analytics account

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** > **Sign-in method**
2. Enable **Google** sign-in provider
3. Add your domain to authorized domains:
   - `localhost` (for development)
   - Your production domain (when deploying)

## Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for now)
4. Select a location closest to your users
5. Click "Done"

## Step 4: Enable Storage

1. Go to **Storage**
2. Click "Get started"
3. Choose **Start in test mode**
4. Select same location as Firestore
5. Click "Done"

## Step 5: Get Configuration

### Web App Config
1. Go to **Project settings** (gear icon) > **General**
2. Scroll down to "Your apps"
3. Click "Add app" > Web app icon `</>`
4. App nickname: `proofreader-web`
5. Check "Also set up Firebase Hosting" (optional)
6. Copy the `firebaseConfig` object values

### Service Account Key
1. Go to **Project settings** > **Service accounts**
2. Click "Generate new private key"
3. Download the JSON file
4. Keep it secure - you'll need values from it

## Step 6: Update Environment Variables

Add these to your `.env.local` file:

```env
# Firebase Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_private_key_content\n-----END PRIVATE KEY-----"

# Upstage API Key
UPSTAGE_API_KEY=up_your_upstage_key_here
```

## Step 7: Firestore Security Rules

Update your Firestore rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own documents
    match /documents/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid || resource.data.isPublic == true);
    }
    
    // Allow reading public documents
    match /documents/{documentId} {
      allow read: if resource.data.isPublic == true;
    }
  }
}
```

## Step 8: Storage Security Rules

Update your Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 9: Test Setup

Run the Firebase test command:
```bash
make firebase-test
```

## Common Issues

### Invalid API Key
- Check that all environment variables are set correctly
- Make sure there are no extra spaces or quotes
- Restart your development server after updating .env.local

### Authentication Errors
- Verify Google sign-in is enabled
- Check that localhost is in authorized domains
- Make sure service account JSON is valid

### Firestore Permission Errors
- Update security rules as shown above
- Make sure user is authenticated before accessing documents

### Storage Upload Errors
- Check storage security rules
- Verify storage is enabled in Firebase console
- Make sure file types are allowed

## Next Steps

After setup is complete:
1. Test document upload
2. Test authentication flow
3. Verify Firestore document creation
4. Test document analysis features

For production deployment, update security rules to be more restrictive. 