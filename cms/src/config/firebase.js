import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase 설정 - 환경 변수에서 가져오기
// SECURITY: NEVER commit actual API keys! Always use environment variables.
// Set these in Vercel dashboard: Settings > Environment Variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate configuration
if (!firebaseConfig.apiKey) {
    console.error('Firebase configuration missing! Please set environment variables in Vercel.');
}

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 내보내기
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 익명 인증 자동 로그인
onAuthStateChanged(auth, (user) => {
    if (!user) {
        signInAnonymously(auth)
            .then(() => {
                console.log('Signed in anonymously');
            })
            .catch((error) => {
                console.error('Anonymous auth failed:', error);
            });
    }
});

export default app;