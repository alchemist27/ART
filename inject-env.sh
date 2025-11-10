#!/bin/bash
# Inject environment variables into env-config.js

echo "🔧 Injecting environment variables..."
echo "📁 Working directory: $(pwd)"
echo "📄 env-config.js exists: $([ -f env-config.js ] && echo 'yes' || echo 'no')"

# Check if environment variables are set
echo "🔑 Checking environment variables:"
echo "  VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY:0:10}..."
echo "  VITE_FIREBASE_PROJECT_ID: ${VITE_FIREBASE_PROJECT_ID}"

# Create backup
cp env-config.js env-config.js.backup

# Use sed with backup flag for cross-platform compatibility
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|__FIREBASE_API_KEY__|${VITE_FIREBASE_API_KEY}|g" env-config.js
    sed -i '' "s|__FIREBASE_AUTH_DOMAIN__|${VITE_FIREBASE_AUTH_DOMAIN}|g" env-config.js
    sed -i '' "s|__FIREBASE_PROJECT_ID__|${VITE_FIREBASE_PROJECT_ID}|g" env-config.js
    sed -i '' "s|__FIREBASE_STORAGE_BUCKET__|${VITE_FIREBASE_STORAGE_BUCKET}|g" env-config.js
    sed -i '' "s|__FIREBASE_MESSAGING_SENDER_ID__|${VITE_FIREBASE_MESSAGING_SENDER_ID}|g" env-config.js
    sed -i '' "s|__FIREBASE_APP_ID__|${VITE_FIREBASE_APP_ID}|g" env-config.js
    sed -i '' "s|__CAFE24_SHOP_ID__|${CAFE24_SHOP_ID}|g" env-config.js
else
    # Linux (Vercel)
    sed -i "s|__FIREBASE_API_KEY__|${VITE_FIREBASE_API_KEY}|g" env-config.js
    sed -i "s|__FIREBASE_AUTH_DOMAIN__|${VITE_FIREBASE_AUTH_DOMAIN}|g" env-config.js
    sed -i "s|__FIREBASE_PROJECT_ID__|${VITE_FIREBASE_PROJECT_ID}|g" env-config.js
    sed -i "s|__FIREBASE_STORAGE_BUCKET__|${VITE_FIREBASE_STORAGE_BUCKET}|g" env-config.js
    sed -i "s|__FIREBASE_MESSAGING_SENDER_ID__|${VITE_FIREBASE_MESSAGING_SENDER_ID}|g" env-config.js
    sed -i "s|__FIREBASE_APP_ID__|${VITE_FIREBASE_APP_ID}|g" env-config.js
    sed -i "s|__CAFE24_SHOP_ID__|${CAFE24_SHOP_ID}|g" env-config.js
fi

echo "✅ Environment variables injected successfully"
echo "📄 First few lines of env-config.js:"
head -n 5 env-config.js
