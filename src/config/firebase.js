import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDNfK49NR1dfbN0TSb35FI85huw8YJfcyQ",
    authDomain: "odevtakip-145f5.firebaseapp.com",
    projectId: "odevtakip-145f5",
    storageBucket: "odevtakip-145f5.firebasestorage.app",
    messagingSenderId: "1083778395806",
    appId: "1:1083778395806:web:c67f99e34a11e5a330958f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
