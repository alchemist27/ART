#!/bin/bash
# Inject environment variables into env-config.js

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
