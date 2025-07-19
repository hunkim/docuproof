#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path-to-service-account.json>"
    echo "Example: $0 ~/Downloads/proofreader-writer-xxx-firebase-adminsdk-xxx.json"
    exit 1
fi

SERVICE_ACCOUNT_FILE="$1"

if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "❌ Service account file not found: $SERVICE_ACCOUNT_FILE"
    exit 1
fi

echo "🔥 Completing Firebase Setup..."
echo ""

# Extract values from service account JSON
PROJECT_ID=$(grep -o '"project_id": *"[^"]*"' "$SERVICE_ACCOUNT_FILE" | cut -d'"' -f4)
CLIENT_EMAIL=$(grep -o '"client_email": *"[^"]*"' "$SERVICE_ACCOUNT_FILE" | cut -d'"' -f4)
PRIVATE_KEY=$(grep -o '"private_key": *"[^"]*"' "$SERVICE_ACCOUNT_FILE" | cut -d'"' -f4)

echo "📋 Extracted from service account:"
echo "   Project ID: $PROJECT_ID"
echo "   Client Email: $CLIENT_EMAIL"
echo ""

# Add to .env.local
echo "FIREBASE_CLIENT_EMAIL=$CLIENT_EMAIL" >> .env.local
echo "FIREBASE_PRIVATE_KEY=\"$PRIVATE_KEY\"" >> .env.local

echo "✅ Added service account credentials to .env.local"
echo ""

# Deploy Firebase rules and indexes
echo "🚀 Deploying Firebase configuration..."
firebase deploy --only firestore:rules,firestore:indexes,storage --project=proofreader-writer-1752894578

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Firebase setup complete!"
    echo ""
    echo "📋 Environment variables configured:"
    echo "   • Firebase Web SDK config"
    echo "   • Firebase Admin SDK config"
    echo "   • Upstage API key"
    echo ""
    echo "🔧 Services deployed:"
    echo "   • Firestore security rules"
    echo "   • Storage security rules"
    echo "   • Database indexes"
    echo ""
    echo "🧪 Test your setup:"
    echo "   make firebase-test"
    echo ""
    echo "🚀 Start your app:"
    echo "   make dev"
else
    echo ""
    echo "❌ Deployment failed. Please check that you've enabled:"
    echo "   • Authentication (with Google provider)"
    echo "   • Firestore Database"
    echo "   • Storage"
    echo ""
    echo "Then try again: ./complete-firebase-setup.sh $SERVICE_ACCOUNT_FILE"
fi 