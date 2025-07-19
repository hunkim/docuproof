// Firebase Configuration Test Script
const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');
const { getStorage, connectStorageEmulator } = require('firebase/storage');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔥 Firebase Configuration Test\n');

// Check environment variables
console.log('📋 Checking Environment Variables:');
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

let missingVars = [];
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  ✅ ${varName}: ${varName.includes('PRIVATE_KEY') ? '[HIDDEN]' : process.env[varName].substring(0, 20)}...`);
  } else {
    console.log(`  ❌ ${varName}: Missing`);
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log(`\n❌ Missing ${missingVars.length} required environment variables:`);
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\nPlease check your .env.local file and follow FIREBASE_SETUP.md');
  process.exit(1);
}

console.log('\n🚀 Testing Firebase Initialization:');

try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  console.log('  ✅ Firebase app initialized');

  // Test Auth
  const auth = getAuth(app);
  console.log(`  ✅ Firebase Auth initialized (Project: ${auth.app.options.projectId})`);

  // Test Firestore
  const db = getFirestore(app);
  console.log(`  ✅ Firestore initialized (Project: ${db.app.options.projectId})`);

  // Test Storage
  const storage = getStorage(app);
  console.log(`  ✅ Firebase Storage initialized (Bucket: ${storage.app.options.storageBucket})`);

  console.log('\n🎉 Firebase configuration is valid!');
  console.log('\nNext steps:');
  console.log('  1. Make sure you\'ve set up Authentication in Firebase Console');
  console.log('  2. Enable Google sign-in provider');
  console.log('  3. Create Firestore database in test mode');
  console.log('  4. Enable Firebase Storage');
  console.log('  5. Update security rules as shown in FIREBASE_SETUP.md');

} catch (error) {
  console.log(`\n❌ Firebase initialization failed:`);
  console.error(error.message);
  
  if (error.code === 'auth/invalid-api-key') {
    console.log('\n💡 This usually means:');
    console.log('  - API key is incorrect');
    console.log('  - Project ID doesn\'t match');
    console.log('  - Firebase project hasn\'t been created yet');
  }
  
  console.log('\nPlease check FIREBASE_SETUP.md for detailed setup instructions.');
  process.exit(1);
}

// Test Admin SDK
console.log('\n🔧 Testing Firebase Admin SDK:');
try {
  const admin = require('firebase-admin');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  
  console.log('  ✅ Firebase Admin SDK initialized');
  console.log(`  ✅ Service account: ${process.env.FIREBASE_CLIENT_EMAIL}`);
  
} catch (error) {
  console.log(`\n❌ Firebase Admin SDK failed:`);
  console.error(error.message);
  console.log('\n💡 Make sure you have:');
  console.log('  - Downloaded service account JSON from Firebase Console');
  console.log('  - Set FIREBASE_PRIVATE_KEY correctly (with proper line breaks)');
  console.log('  - Set FIREBASE_CLIENT_EMAIL and FIREBASE_PROJECT_ID');
}

console.log('\n🔥 Firebase test complete!'); 